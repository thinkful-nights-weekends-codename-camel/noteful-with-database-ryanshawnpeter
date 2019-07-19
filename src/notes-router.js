const path = require('path');
const express = require('express');
const xss = require('xss');
const NotesJson = express.json();
const NotesRouter = express.Router();
const logger = require('./logger');
const NotesService = require('./notes/notes-service');

const serializeNote =  note => ({
  id: note.id,
  note_title: xss(note.note_title),
  date_modified: note.date_modified,
  folder_id: note.folder_id,
  content: xss(note.content),
})

NotesRouter
  .route('/api/notes')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes);
      })
      .catch(next)
  })
  .post(NotesJson, (req, res, next) => {
    for (let entry of ["note_title", "content"]) {
      if (!req.body[entry]) {
        logger.error(`Title and Content are required.`)
        return res.status(400).send('Invalid data');
      }
    }

    const newNote =
    {
      note_title,
      // modified,
      // folderId,
      content
    };

    NotesService.insertNote(req.app.get('db'), newNote)
      .then(note => {
        res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${note.id}`))
        .json(note)
      })
      .catch(next)
  })

// bookmarksRouter
//   .route('/api/bookmarks/:bookmark_id')
//   .all((req, res, next) => {
//     const { bookmark_id } = req.params
//     BookmarksService.getById(
//       req.app.get('db'),
//       bookmark_id
//     )
//       .then(bookmark => {
//         if (!bookmark) {
//           logger.error(`Bookmark with id ${bookmark_id} not found.`)
//           return res.status(404).json({
//             error: { message: `Bookmark does not exist`}
//           })
//         }
//         res.bookmark = bookmark
//         next()
//       })
//       .catch(next)
//   })
//   .get((req, res) => {
//     res.json(serializeBookmark(res.bookmark))
//   })
//   .delete((req, res, next) => {
//     const { bookmark_id } = req.params
//     BookmarksService.deleteBookmark(
//       req.app.get('db'),
//       bookmark_id
//     )
//       .then(() => {
//         logger.info(`Bookmark with id ${bookmark_id} deleted.`)
//         res.status(204).end()
//       })
//       .catch(next)
//   })
//   .patch(bookmarksJson, (req, res, next) => {
//     const { title, url, rating, description } = req.body;
//     const bookmarkToUpdate = { title, url, rating, description }
    
//     const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
//     if (numberOfValues === 0) {
//       return res.status(400).json({
//         error: { message: `Request body must contain either 'title', 'url', 'rating', or 'description'`}
//       })
//     }

//     BookmarksService.updateBookmark(
//       req.app.get('db'),
//       req.params.bookmark_id,
//       bookmarkToUpdate
//     )
//       .then(() => {
//         res.status(204).end()
//       })
//       .catch(next)
//   })

module.exports = NotesRouter;