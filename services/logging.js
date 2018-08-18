const colors = require('colors');

function* nextColor() {
	while(true) {
		yield 'red';
		yield 'green';
		yield 'yellow';
		yield 'blue';
		yield 'magenta';
		yield 'cyan';
		yield 'grey';
	}
}

function validColor(color) {
	return color === 'black' || color === 'red' || color === 'green' || color === 'yellow' || color === 'blue' || color === 'magenta' || color === 'cyan' || color === 'white' || color === 'grey' || color === 'gray';
}

class Logging {
	constructor() {
		this.data = {
			constants: {
				types: {
					GENERAL: 'LOG ',
					INFO: 'INFO',
					WARN: 'WARN',
					ERROR: 'ERR ',
					SUCCESS: 'DONE',
					FAIL: 'FAIL'
				},
				domains: {
					GENERAL: 'white'
				}
			},
			domains: new Map([
				['general', {
					color: 'white',
					log: []
				}]
			])
		}
	}

	/**
	 * Adds a new domain with an optional color
	 * @param domain String The domain to log with
	 * @param color String Color to color the text in console with (Via Colors)
	 */
	addDomain(domain, color=nextColor()) {
		if (!this.data.domains.has(domain))
			if (validColor(color))
				this.data.domains.set(domain, {
					color,
					log: []
				});
			else
				this.data.domains.set(domain, {
					color: nextColor(),
					log: []
				});
	}

	/**
	 * Auto-binds a domain to the logging commands
	 * @param domain String The domain to log with
	 * @returns {{log: function, info: function, warn: function, error: function, success: function, fail: function}}
	 */
	useDomain(domain) {
		return {
			log: this.log.bind(this, [domain]),
			info: this.info.bind(this, [domain]),
			warn: this.warn.bind(this, [domain]),
			error: this.error.bind(this, [domain]),
			success: this.success.bind(this, [domain]),
			fail: this.fail.bind(this, [domain])
		}
	}

	/**
	 * Log from a domain
	 * @param domain String The domain to log with
	 * @param type String The type to be logged with
	 * @param location Location the log came from in the code
	 * @param text The log text itself
	 */
	log(domain, type=this.data.constants.types.GENERAL, location, text) {
		const message = `[${domain}] ${type} ${location} ${text}`;

		let domainObject = this.data.domains.get(domain);
		if (domainObject === undefined) domainObject = this.data.domains.get('general');

		domainObject.log.push(message);
		console.log(message[domainObject.color]);
	}

	/**
	 * Log info from a domain
	 * @param domain String The domain to log with
	 * @param location Location the log came from in the code
	 * @param text The log text itself
	 */
	info(domain, location, text) {
		this.log(domain, this.data.constants.types.INFO, location, text);
	}

	/**
	 * Log a warning from a domain
	 * @param domain String The domain to log with
	 * @param location Location the log came from in the code
	 * @param text The log text itself
	 */
	warn(domain, location, text) {
		this.log(domain, this.data.constants.types.WARN, location, text);
	}

	/**
	 * Log an error from a domain
	 * @param domain String The domain to log with
	 * @param location Location the log came from in the code
	 * @param text The log text itself
	 */
	error(domain, location, text) {
		this.log(domain, this.data.constants.types.ERROR, location, text);
	}

	/**
	 * Log a success from a domain
	 * @param domain String The domain to log with
	 * @param location Location the log came from in the code
	 * @param text The log text itself
	 */
	success(domain, location, text) {
		this.log(domain, this.data.constants.types.SUCCESS, location, text);
	}

	/**
	 * Log a failure from a domain
	 * @param domain String The domain to log with
	 * @param location Location the log came from in the code
	 * @param text The log text itself
	 */
	fail(domain, location, text) {
		this.log(domain, this.data.constants.types.FAIL, location, text);
	}
}

module.exports = new Logging();