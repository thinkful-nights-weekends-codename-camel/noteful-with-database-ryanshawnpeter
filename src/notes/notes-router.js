const path = require('path');
const express = require('express');
const xss = require('xss');
const NotesJson = express.json();
const NotesRouter = express.Router();
// const logger = require('../logger');
const NotesService = require('./notes-service');

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
    const { note_title, content, folder_id } = req.body;
    const newNote = { note_title, content, folder_id };

    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        // logger.error(`Title and Content are required.`)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }
    
    NotesService.insertNotes(req.app.get('db'), newNote)
      .then(note => {
        res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${note.id}`))
        .json(serializeNote(note))
      })
      .catch(next)
  })

NotesRouter
  .route('/api/notes/:note_id')
  .all((req, res, next) => {
    const { note_id } = req.params
    NotesService.getById(
      req.app.get('db'),
      note_id
    )
      .then(note => {
        if (!note) {
          // logger.error(`Note with id ${note_id} not found.`)
          return res.status(404).json({
            error: { message: `Note does not exist`}
          })
        }
        res.note = note
        next()
      })
      .catch(next)
  })
  .get((req, res) => {
    res.json(serializeNote(res.note))
  })
  .delete((req, res, next) => {
    const { note_id } = req.params
    NotesService.deleteNotes(
      req.app.get('db'),
      note_id
    )
      .then(() => {
        // logger.info(`Note with id ${note_id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(NotesJson, (req, res, next) => {
    const { note_title, content } = req.body;
    const noteToUpdate = { note_title, content }
    
    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: { message: `Request body must contain either 'note_title' or 'content'`}
      })
    }

    NotesService.updateNotes(
      req.app.get('db'),
      req.params.note_id,
      noteToUpdate
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = NotesRouter;