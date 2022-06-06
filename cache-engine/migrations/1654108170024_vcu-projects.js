/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
	pgm.createTable('vcu_projects', {
		id: 'id',
		block_number: {
			type: 'int',
			notNull: true
		},
		hash: {
			type: 'varchar(66)',
			notNull: true
		},
		project_id: {
			type: 'int',
			notNull: true,
			unique: true
		},
		asset_id: {
			type: 'int'
		},
		originator: {
			type: 'varchar(64)',
			notNull: true
		},
		name: {
			type: 'varchar',
		},
		description: {
			type: 'text',
		},
		registry_name: {
			type: 'varchar',
		},
		registry_id: {
			type: 'int',
		},
		registry_summary: {
			type: 'text',
		},
		signer: {
			type: 'varchar(64)',
			notNull: true
		},
		approved: {
			type: 'boolean',
			default: false
		},
		total_supply: {
			type: 'int'
		},
		minted: {
			type: 'int'
		},
		retired: {
			type: 'int'
		},
		unit_price: {
			type: 'float'
		},
		created_at: {
			type: 'timestamp',
			notNull: true
		},
		updated_at: {
			type: 'timestamp'
		}
	})
};

exports.down = pgm => {
	pgm.dropTable('vcu_projects')
};
