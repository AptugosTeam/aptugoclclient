import stripAnsi from 'strip-ansi'

const detectDefaultShell = () => {
	const {env} = process;

	if (process.platform === 'win32') {
		return env.COMSPEC || 'cmd.exe';
	}

	try {
		const {shell} = userInfo();
		if (shell) {
			return shell;
		}
	} catch {}

	if (process.platform === 'darwin') {
		return env.SHELL || '/bin/zsh';
	}

	return env.SHELL || '/bin/sh';
}

const defaultShell = detectDefaultShell();

const args = [
	'-ilc',
	'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit',
]

const env = {
	// Disables Oh My Zsh auto-update thing that can block the process.
	DISABLE_AUTO_UPDATE: 'true',
};

const parseEnv = env => {
	env = env.split('_SHELL_ENV_DELIMITER_')[1];
	const returnValue = {};

	for (const line of stripAnsi(env).split('\n').filter(line => Boolean(line))) {
		const [key, ...values] = line.split('=');
		returnValue[key] = values.join('=');
	}

	return returnValue;
};

async function shellEnv(shell) {
  const execa = await import('execa')
	if (process.platform === 'win32') {
		return process.env;
	}

	try {
		const {stdout} = await execa(shell || defaultShell, args, {env});
		return parseEnv(stdout);
	} catch (error) {
		if (shell) {
			throw error;
		} else {
			return process.env;
		}
	}
}

function shellEnvSync(shell) {
  import('execa').then((execa) => {
    if (process.platform === 'win32') {
      return process.env;
    }

    try {
      const {stdout} = execa.sync(shell || defaultShell, args, {env});
      return parseEnv(stdout);
    } catch (error) {
      if (shell) {
        throw error;
      } else {
        return process.env;
      }
    }
  })
}

async function shellPath() {
	const {PATH} = await shellEnv();
	return PATH;
}

function shellPathSync() {
	const {PATH} = shellEnvSync();
	return PATH;
}


function fixPath() {
	if (process.platform === 'win32') {
		return;
	}

	process.env.PATH = shellPath() || [
		'./node_modules/.bin',
		'/.nodebrew/current/bin',
		'/usr/local/bin',
		process.env.PATH,
	].join(':');
}

export default fixPath
