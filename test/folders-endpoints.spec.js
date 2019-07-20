
const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray } = require('../test/folders.fixtures');

describe('Folders Endpoints', function () {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db)
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('folders').del());

  afterEach('cleanup', () => db('folders').del());

  describe('GET /api/folders', () => {
    context('Given no folders', () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, [])
      })
    });

    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      });

      it('responds with 200 and all of the folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders)
      })
    })
  });

  describe('GET /folders/:folder_id', () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder does not exist` } })
      })
    });

    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      });

      it('responds with 200 and the specified folder', () => {
        const folderId = 1;
        const expectedFolder = testFolders[folderId - 1]
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(200, expectedFolder)
      });
    });

    context(`Given an XSS attack folder`, () => {
      const maliciousFolder = {
        id: 911,
        folder_name: 'Silly rabbit <script>alert("xss");</script>'
      }

      beforeEach('insert malicious folder', () => {
        return db
          .into('folders')
          .insert(maliciousFolder)
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/folders/${maliciousFolder.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.folder_name).to.eql('Silly rabbit &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
          })
      })
    })
  });

  describe(`POST /api/folders`, () => {
    it(`creates a folder, responds with 201 and new folder`, () => {
      this.retries(3)
      const newFolder = {
        folder_name: 'test title'
      }

      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.folder_name).to.eql(newFolder.folder_name)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/folders/${postRes.body.id}`)
            .expect(postRes.body)
        )
    });

    const requiredFields = ['folder_name'];

    requiredFields.forEach(field => {
      const newFolder = {
        folder_name: 'Test new folder'
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newFolder[field]

        return supertest(app)
          .post('/api/folders')
          .send(newFolder)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    });
  });

  describe(`DELETE /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456;
        return supertest(app)
          .delete(`/api/folder/${folderId}`)
          .expect(404),{ error: { message: `Folder does not exist`}}
      })
    })

    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      });

      it('responds with 204 and removes the folder', () => {
        const idToRemove = 1;
        const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove)
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/folders`)
              .expect(expectedFolders)
          )
      })
    })
  });

  describe(`PATCH /api/folder/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456
        return supertest(app)
          .patch(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder does not exist` } })
      })
    })

    context('Given there are folders in the database', () => { 
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      });

      it('responds with 204 and updates the folder', () => {
        const idToUpdate = 1
        const updateFolder = {
          folder_name: 'updated folder title',
        }
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        }
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send(updateFolder)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 1
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({ irrelevantField: 'foo-fighters' })
          .expect(400, { error: { message: `Request body must contain 'folder_name'`}
          })
      })
    })
  })
});