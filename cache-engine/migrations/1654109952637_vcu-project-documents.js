/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
	pgm.createTable('vcu_project_documents', {
		id: 'id',
		project_id: {
			type: 'int',
			notNull: true
		},
		url: {
			type: 'text'
		}
	})
};

exports.down = pgm => {
	pgm.dropTable('vcu_project_documents')
};
