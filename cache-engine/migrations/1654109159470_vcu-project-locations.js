/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
	pgm.createTable('vcu_project_locations', {
		id: 'id',
		project_id: {
			type: 'int',
			notNull: true
		},
		latitude: {
			type: 'float',
		},
		longitude: {
			type: 'float',
		}
	})
};

exports.down = pgm => {
	pgm.dropTable('vcu_project_locations')
};
