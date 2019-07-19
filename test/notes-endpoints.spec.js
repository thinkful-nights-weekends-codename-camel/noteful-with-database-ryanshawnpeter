const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeNotesArray } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

describe('Notes Endpoints', function () {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db)
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('notes').del());
  before('clean the table', () => db('folders').del());

  afterEach('cleanup', () => db('notes').del());
  afterEach('cleanup', () => db('folders').del());

  describe.only('GET /api/notes', () => {
    context('Given no notes', () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, [])
      })
    });

    context('Given there are notes in the database', () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      // beforeEach('insert folders', () => {
      //   return db
      //     .into('folders')
      //     .insert(testFolders)
      // });

      // beforeEach('insert notes', () => {
      //   return db
      //     .into('notes')
      //     .insert(testNotes)
      // });

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
            .into('notes')
            .insert(testNotes)
          })
      });

      it('responds with 200 and all of the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes)
      })
    })
  });

  describe('GET /notes/:notes_id', () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456;
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note does not exist` } })
      })
    });

    context('Given there are notes in the database', () => {
      const testNotes = makeNotesArray();

      beforeEach('insert notes', () => {
        return db
          .into('notes')
          .insert(testNotes)
      });

      it('responds with 200 and the specified note', () => {
        const noteId = 2;
        const expectedNote = testNotes[noteId - 1]
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(200, expectedNote)
      });
    });

    context(`Given an XSS attack note`, () => {
      const maliciousNote = {
        id: 911,
        note_title: 'Silly rabbit <script>alert("xss");</script>',
        date_modified: '2019-01-03T00:00:00.000Z',
        folder_id: 5,
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      }

      beforeEach('insert malicious note', () => {
        return db 
          .into('notes')
          .insert([ maliciousNote])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes/${maliciousNote.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.note_title).to.eql('Silly rabbit &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  });

  describe(`POST /api/notes`, () => {
    it(`creates a note, responds with 201 and new note`, () => {
      const newNote = {
        note_title: 'test title',
        date_modified: '2019-01-03T00:00:00.000Z',
        folder_id: 1,
        content: '',
      }
      return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.note_title).to.eql(newNote.note_title)
          expect(res.body.date_modified).to.eql(newNote.date_modified)
          expect(res.body.content).to.eql(newNote.content)
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/notes/${postRes.body.id}`)
            .expect(postRes.body)
        )
    });
  });

  describe(`DELETE /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456;
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .expect(404,{ error: { message: `Note does not exist`}})
      })
    })

    context('Given there are notes in the database', () => {
      const testNotes = makeNotesArray();

      beforeEach('insert notes', () => {
        return db
          .into('notes')
          .insert(testNotes)
      })

      it('responds with 204 and removes the notes', () => {
        const idToRemove = 2;
        const expectedNotes = testNotes.filter(note => note.id !== idToRemove)
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/notes`)
              .expect(expectedNotes)
          )
      })
    })
  })

  describe(`PATCH /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .patch(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note does not exist` } })
      })
    })

    context('Given there are notes in the database', () => { 
      const testNotes = makeNotesArray()

      beforeEach('insert notes', () => {
        return db
          .into('notes')
          .insert(testNotes)
      })

      it('responds with 204 and updates the bookmark', () => {
        const idToUpdate = 2
        const updateNote = {
          note_title: 'updated note title',
          date_modified: '2019-01-03T00:00:00.000Z',
          folder_id: 4,
          content: `updated note description`
        }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({ irrelevantField: 'foo-fighters' })
          .expect(400, { error: { message: `Request body must contain either 'note_title' or 'content'`}
          })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2;
        const updateNote = {
          note_title: 'updated note title',
        }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({
            ...updateNote,
            fieldToIgnore: 'should not be in the GET request'
          })
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          )
      })
    })
  })
});