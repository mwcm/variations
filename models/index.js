import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASS,
	{
		dialect: 'postgres',
	}
)

const Chord = sequelize.define('Chord', {
	name: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true
	},
	positions: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		allowNull: false
	},
	fingerings: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		allowNull: false
	}
});

const Transition = sequelize.define('Transition', {
	name: {
		type: DataTypes.STRING,
		allowNull: false
	},
	fromChord: {
		type: DataTypes.JSON,
		allowNull: false
	},
	toChord: {
		type: DataTypes.JSON,
		allowNull: false
	},
	handMovementScore: {
		type: DataTypes.FLOAT,
		allowNull: false
	},
	highFretScore: {
		type: DataTypes.FLOAT,
		allowNull: false
	},
	fingerMovementScore: {
		type: DataTypes.STRING,
		allowNull: false
	},
	totalScore: {
		type: DataTypes.STRING,
		allowNull: false
	}
})

export {sequelize, Chord, Transition}
