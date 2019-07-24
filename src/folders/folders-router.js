const path = require('path');
const express = require('express');
const xss = require('xss');
const FoldersJson = express.json();
const FoldersRouter = express.Router();
// const logger = require('../logger');
const FoldersService = require('./folders-service')

const serializeFolder =  folder => ({
  id: folder.id,
  folder_name: xss(folder.folder_name),
})

FoldersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    FoldersService.getAllFolders(knexInstance)
      .then(folders => {
        res.json(folders);
      })
      .catch(next)
  })
  .post(FoldersJson, (req, res, next) => {
    const { folder_name } = req.body;
    const newFolder = { folder_name } ;

    for (const [key, value] of Object.entries(newFolder)) {
      if (value == null) {
        // logger.error(`Name is required.`)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }

    FoldersService.insertFolders(req.app.get('db'), newFolder)
      .then(folder => {
        res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${folder.id}`))
        .json(folder)
      })
      .catch(next)
  })

FoldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    const { folder_id } = req.params
    FoldersService.getById(
      req.app.get('db'),
      folder_id
    )
      .then(folder => {
        if (!folder) {
          // logger.error(`Folder with id ${folder_id} not found.`)
          return res.status(404).json({
            error: { message: `Folder does not exist`}
          })
        }
        res.folder = folder
        next()
      })
      .catch(next)
  })
  .get((req, res) => {
    res.json(serializeFolder(res.folder))
  })
  .delete((req, res, next) => {
    const { folder_id } = req.params
    FoldersService.deleteFolders(
      req.app.get('db'),
      folder_id
    )
      .then(() => {
        // logger.info(`Folder with id ${folder_id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(FoldersJson, (req, res, next) => {
    const { folder_name  } = req.body;
    const folderToUpdate = { folder_name }
    
    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: { message: `Request body must contain 'folder_name'`}
      })
    }

    FoldersService.updateFolders(
      req.app.get('db'),
      req.params.folder_id,
      folderToUpdate
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = FoldersRouter;