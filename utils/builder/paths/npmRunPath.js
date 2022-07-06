const path = require('path')
const url = require('url')

function pathKey(options = {}) {
	const {
		env = process.env,
		platform = process.platform
	} = options;

	if (platform !== 'win32') {
		return 'PATH';
	}

	return Object.keys(env).reverse().find(key => key.toUpperCase() === 'PATH') || 'Path';
}

module.exports.npmRunPath = (options = {}) => {
	const {
		cwd = process.cwd(),
		path: path_ = process.env[pathKey()],
		execPath = process.execPath,
	} = options;

	let previous;
	const cwdString = cwd instanceof URL ? url.fileURLToPath(cwd) : cwd;
	let cwdPath = path.resolve(cwdString);
	const result = [];

	while (previous !== cwdPath) {
		result.push(path.join(cwdPath, 'node_modules/.bin'));
		previous = cwdPath;
		cwdPath = path.resolve(cwdPath, '..');
	}

	// Ensure the running `node` binary is used.
	result.push(path.resolve(cwdString, execPath, '..'));

	return [...result, path_].join(path.delimiter);
}
