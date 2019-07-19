const FoldersService = {
  getAllFolders(knex) {
    return knex.select('*').from('folders')
  },
  insertFolders(knex,newFolder) {
    return knex
      .insert(newFolder)
      .into('folders')
      .returning('*')
      .then(rows => {
        return rows[0]
      })
  },
  getById(knex,id) {
    return knex
    .select('*')
    .from('folders')
    .where('id', id)
    .first()
  },
  deleteFolders(knex, id) {
    return knex('folders')
      .where({ id })
      .delete()
  },
  updateFolders(knex, id, newFolderFields) {
    return knex('folders')
      .where({ id })
      .update(newFolderFields)
  },
 }
 
 module.exports = FoldersService;