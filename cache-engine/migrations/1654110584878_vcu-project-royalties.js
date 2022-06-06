/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
	pgm.createTable('vcu_project_royalties', {
		id: 'id',
		project_id: {
			type: 'int',
			notNull: true
		},
		account: {
			type: 'varchar(64)',
			notNull: true
		},
		fee_percent: {
			type: 'float'
		},
	})
};

exports.down = pgm => {
	pgm.dropTable('vcu_project_royalties')
};
