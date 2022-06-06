/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
	pgm.createTable('vcu_project_batches', {
		id: 'id',
		project_id: {
			type: 'int',
			notNull: true
		},
		name: {
			type: 'varchar'
		},
		uuid: {
			type: 'int'
		},
		issuance_year: {
			type: 'int'
		},
		start_date: {
			type: 'timestamp'
		},
		end_date: {
			type: 'timestamp'
		},
		total_supply: {
			type: 'int'
		},
		minted: {
			type: 'int'
		},
		retired: {
			type: 'int'
		}
	})
};

exports.down = pgm => {
	pgm.dropTable('vcu_project_batches')
};
