/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
	pgm.createTable('vcu_project_sdgs', {
		id: 'id',
		project_id: {
			type: 'int',
			notNull: true
		},
		type: {
			type: 'text'
		},
		description: {
			type: 'text'
		},
		references: {
			type: 'text'
		}
	})
};

exports.down = pgm => {
	pgm.dropTable('vcu_project_sdgs')
};
