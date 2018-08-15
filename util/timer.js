class timer {
	constructor(interval=60000) {
		this.data = {
			startTime: Date.now(),
			interval,
			realInterval: 0,
			tick: 0,
			hooks: new Map(),
			timer: undefined
		};

		this.data.timer = setTimeout(this.runHooks.bind(this), this.getNextInterval());
	}

	getNextInterval() {
		return ((this.data.interval * (this.data.tick + 1)) + this.data.startTime - Date.now());
	}

	runHooks() {
		for (const [,hook] of this.data.hooks)
			if (!((this.data.tick - hook.initTick) % hook.interval))
				hook.callback(this.data.realInterval);

		this.data.tick++;
		this.data.realInterval = this.getNextInterval();
		this.data.timer = setTimeout(this.runHooks.bind(this), this.data.realInterval);
	}

	changeInterval(newInterval) {
		this.data.interval = newInterval;
	}

	setHook(id, interval, callback, initTick=this.data.tick) {
		this.data.hooks.set(id, {
			id,
			initTick,
			interval,
			callback
		});
	}

	modifyHook(id, {interval, callback, initTick}) {
		const hook = this.data.hooks.get(id);

		if (hook)
			this.data.hooks.set(id, {
				id,
				initTick: initTick ? initTick : hook.initTick,
				interval: interval ? interval : hook.interval,
				callback: callback ? callback : hook.callback
			});
	}

	deleteHook(id) {
		this.data.hooks.delete(id);
	}
}

module.exports = timer;