
const NotesService = {
  getAllNotes(knex) {
    return knex.select('*').from('notes')
  },
  insertNotes(knex,newNote) {
    return knex
      .insert(newNote)
      .into('notes')
      .returning('*')
      .then(rows => {
        return rows[0]
      })
  },
  getById(knex,id) {
    return knex
    .select('*')
    .from('notes')
    .where('id', id)
    .first()
  },
  deleteNotes(knex, id) {
    return knex('notes')
      .where({ id })
      .delete()
  },
  updateNotes(knex, id, newNoteFields) {
    return knex('notes')
      .where({ id })
      .update(newNoteFields)
  },
 }
 
 module.exports = NotesService;