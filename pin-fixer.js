/**
 * A static class for manipulating the scale of map pins
 *
 * @class PinFixer
 */
class PinFixer {
	/** @type {Number} */ 
	static get minCanvScale() { return 0.1; }
	/** @type {Number} */
	static get maxCanvScale() { return CONFIG.Canvas.maxZoom; }

	/** @type {object} */
	static get flags()        { return canvas.scene.data.flags; }
	
	static get enabled()      { return Boolean(this.flags.pinfix?.enable); }
	static get zoomFloor()    { return  Number(this.flags.pinfix?.zoomFloor ?? this.minCanvScale); }
	static get zoomCeil()     { return  Number(this.flags.pinfix?.zoomCeil  ?? this.maxCanvScale); }
	static get minScale()     { return  Number(this.flags.pinfix?.minScale  ?? 1); }
	static get maxScale()     { return  Number(this.flags.pinfix?.maxScale  ?? 1); }
	static get hudScale()     { return  Number(this.flags.pinfix?.hudScale  ?? 1); }

	/**
	 * This set of data is used to define any HUDs from
	 * other modules that could benefit from scaling.
	 *
	 * @typedef HudData - A set of data about a HUD for pins
	 * @property {string} hook - The name of the hook for rendering this HUD
	 * @property {string} id - The HTML id attribute of this HUDs HTML
	 *
	 * @readonly
	 * @static
	 * @memberof PinFixer
	 */
	static get huds() {
		return [
			{ hook: "renderPinCushionHUD", id: "pin-cushion-hud" },
			{ hook: "renderPoiTpHUD", id: "poi-tp-ctx-menu" }
		]
	}

	/**
	 * Calculates the reciprocal of a number
	 *
	 * @static
	 * @param {number} number - The number to calculate the reciprocal of
	 * @return {number} The reciprocal
	 * @memberof PinFixer
	 */
	static reciprocal(number) { return 1 / number; }

	/**
	 * Map one range of numbers to another range,
	 * then take an input number to the first range
	 * and output the mapped number from the second range.
	 *
	 * https://rosettacode.org/wiki/Map_range#JavaScript
	 *
	 * @static
	 * @param {[number, number]} from - The first range in which the input falls
	 * @param {[number, number]} to - The range to map to, from which to draw the output
	 * @param {number} s - The number in the first range to map to the second range
	 * @return {number} The mapped number
	 * @memberof PinFixer
	 */
	static map(from, to, s) {
		return to[0] + (s - from[0]) * (to[1] - to[0]) / (from[1] - from[0]);
	}
	
	/**
	 * Clamps the zoom level between zoomFloor and zoomCeil
	 *
	 * @static
	 * @param {number} zoom - The current zoom level
	 * @return {number} The zoom after being clamped 
	 * @memberof PinFixer
	 */
	static clampZoom(zoom) {
		return Math.clamped(zoom, this.zoomFloor, this.zoomCeil);
	}
	/**
	 * Maps the zoom level from the clamped range to the
	 * user configured range limits for scaling.
	 *
	 * @static
	 * @param {number} zoom - The current zoom level
	 * @return {number} The zoom after being mapped
	 * @memberof PinFixer
	 */
	static remapZoom(zoom) {
		return this.map([this.zoomFloor, this.zoomCeil], [this.minScale, this.maxScale], zoom);
	}
	/**
	 * Calculates the scale factor for the note pins,
	 * this value adjust their scale based on the canvas
	 * zoom.
	 *
	 * @static
	 * @param {number} scale - The current canvas scale
	 * @return {number} The scale factor
	 * @memberof PinFixer
	 */
	static noteScaleFactor(scale) {
		return this.remapZoom(this.clampZoom(scale));
	}

	/**
	 * Calculates the scale factor for HUDs
	 * based on basic reciprical scaling and the
	 * user configured scale factor.
	 *
	 * @static
	 * @param {number} scale - The canvas scale
	 * @return {number} The scale factor
	 * @memberof PinFixer
	 */
	static hudScaleFactor(scale) {
		return this.noteScaleBasic(scale) * this.hudScale;
	}

	/**
	 * Calculates the scale for a note based on the
	 * note scale factor.
	 *
	 * @static
	 * @param {number} scale - The canvas scale
	 * @return {number} The scale for the note
	 * @memberof PinFixer
	 */
	static noteScaleConfigured(scale) {
		return this.reciprocal(scale) * this.noteScaleFactor(scale);
	}
	/**
	 * Calculates the scale for a note bases on the 
	 * reciprocal of the canvas scale.
	 *
	 * @static
	 * @param {number} scale - The canvas scale
	 * @return {number} The scale for the note
	 * @memberof PinFixer
	 */
	static noteScaleBasic(scale) {
		return this.reciprocal(scale);
	}
	
	/**
	 * Set the scale of a note on the canvas.
	 *
	 * @static
	 * @param {Note} note - The Note object representing a map pin
	 * @param {number} scale - The scale to set the note to
	 * @memberof PinFixer
	 */
	static scaleNote(note, scale) {
		note.transform.scale.x = scale;
		note.transform.scale.y = scale;
	}
	/**
	 * Scale all the notes in the scene
	 *
	 * @static
	 * @param {number} scale - The scale to set the notes to
	 * @memberof PinFixer
	 */
	static scaleNotes(scale) {
		const scaled = this.noteScaleConfigured(scale);
		canvas.notes.objects.children.forEach(note => 
			this.scaleNote(note, scaled)
		);
	}
	
	/**
	 * Scale a HUD HTML by setting the CSS transform.
	 *
	 * @static
	 * @param {string} hudId - The HTML id of the HUD
	 * @param {number} scale - The scale to set the HUD to
	 * @memberof PinFixer
	 */
	static scaleHUD(hudId, scale) {
		const hud = document.getElementById(hudId);
		if (hud) hud.style.transform = `scale(${scale})`;
	}
	/**
	* Scale all the HUDs
	*
	* @static
	* @param {number} scale - The scale to set the HUDs to
	* @memberof PinFixer
	*/
	static scaleHUDs(scale) {
		const hudScale = this.hudScaleFactor(scale);
		this.huds.forEach(hud => this.scaleHUD(hud.id, hudScale));
	}
	
	/**
	 * Reset the CSS transform of the HUD HTML
	 * by setting it to an empty string.
	 *
	 * @static
	 * @param {string} hudId - The HTML id of the HUD
	 * @memberof PinFixer
	 */
	static resetHudScale(hudId) {
		const hud = document.getElementById(hudId);
		if (hud) hud.style.transform = "";
	}
	/**
	 * Reset the scale of all HUDs
	 *
	 * @static
	 * @memberof PinFixer
	 */
	static resetHUDs() {
		this.huds.forEach(hud => this.resetHudScale(hud.id));
	}
	
	/**
	 * Reset all pins to normal size,
	 * and reset all HUDs
	 *
	 * @static
	 * @memberof PinFixer
	 */
	static reset() {
		this.scaleNotes(1);
		this.resetHUDs();
	}

	/**
	 * Handle the canvasPan Hook
	 *
	 * @static
	 * @param {Canvas} canvas - The main canvas
	 * @param {object} pan - A data object of canvas pan data
	 * @param {number} pan.x - The x coordinate of the canvas after paning
	 * @param {number} pan.y - The y coordinate of the canvas after paning
	 * @param {number} pan.scale - The scale factor of the canvas after paning.
	 * @return {void} Return early if Pin Fixer isn't enabled for the scene
	 * @memberof PinFixer
	 */
	static canvasPan(canvas, pan) {
		if (!this.enabled) return;
		this.scaleNotes(pan.scale);
		this.scaleHUDs(pan.scale);
	}
	/**
	 * Handle the rendering Hooks for HUDs
	 *
	 * @static
	 * @param {string} id - The HTML id of the HUD
	 * @param {PlaceblesHUD} hud - The HUD object
	 * @param {jQuery} html - The HTML of the HUD
	 * @param {object} data - data associated with this rendering
	 * @return {void} Return early if Pin Fixer isn't enabled for the scene
	 * @memberof PinFixer
	 */
	static renderHUD(id, hud, html, data) {
		if (!this.enabled) return;
		const hudScale = this.hudScaleFactor(canvas.stage.scale.x);
		this.scaleHUD(id, hudScale);
	}
	/**
	 * Handles the updateScene Hook
	 * If Pin Fixer is inabled for the scene
	 * updated everything as if the canvas had paned
	 * 
	 * Otherwise, reset everything.
	 *
	 * @static
	 * @param {Scene} scene - The Scene object
	 * @param {object} data - The data of the update
	 * @param {object} options - The update options
	 * @memberof PinFixer
	 */
	static updateScene(scene, data, options) {
		if (!this.enabled) this.reset();
		else this.canvasPan(canvas, { scale: canvas.stage.scale.x });
	}
	/**
	 * Handles the renderSceneConfig Hook
	 *
	 * Injects HTML into the scene config.
	 *
	 * @static
	 * @param {SceneConfig} sceneConfig - The Scene config sheet
	 * @param {jQuery} html - The HTML of the sheet
	 * @param {object} data - Data associated with the sheet rendering
	 * @memberof PinFixer
	 */
	static renderSceneConfig(sceneConfig, html, data) {
		html.find(".form-group").last().after(this.getSceneHtml(this.getSceneTemplateData(data)));
	}
	/**
	 * An object containing settings for the Pin Fixer module for a given scene
	 *
	 * @typedef PinFixSettings
	 * @property {boolean} enable - Whether or not the module is enabled for the given scene
	 * @property {float} zoomFloor - The lower limit of scaling 
	 * @property {float} zoomCeil - The upper limit of scaling
	 * @property {float} minScale - The smallest allowed pin scale
	 * @property {float} maxScale - The largest allowed pin scale
	 * @property {float} hudScale - The scale factor for the HUD
	 * 
	*//**
	 * Retrieves the current data for the scene being configured.
	 *
	 * @static
	 * @param {object} data - The data being passed to the scene config template
	 * @return {PinFixSettings}
	 * @memberof PinFixer
	 */
	static getSceneTemplateData(data) {
		return data.entity?.flags?.pinfix || {
			enable: false,
			zoomFloor: this.minCanvScale,
			zoomCeil: this.maxCanvScale,
			minScale: 1,
			maxScale: 1,
			hudScale: 1
		}
	}

	/**
	 * The HTML to be added to the scene configuration
	 * in order to configure Pin Fixer for the scene.
	 *
	 * @param {PinFixSettings} settings - The Pin Fixer settings of the scene being configured.
	 * @static
	 * @return {string} The HTML to be injected
	 * @memberof PinFixer
	 */
	static getSceneHtml(settings) {
		return `
		<hr>
		<h3 class="form-header"><i class="fas fa-bookmark"></i> ${game.i18n.localize("pinfix.title")}</h3>
		<p class="notes">${game.i18n.localize("pinfix.description")}</p>
		<div class="form-group">
			<label>${game.i18n.localize("pinfix.enable.name")}</label>
			<input type="checkbox" name="flags.pinfix.enable" data-dtype="Boolean"${settings.enable ? " checked" : ""}>
			<p class="notes">${game.i18n.localize("pinfix.enable.desc")}</p>
		</div>
		<div class="form-group">
			<label>${game.i18n.localize("pinfix.minScale.name")}</label>
			<input type="text" name="flags.pinfix.minScale" data-dtype="Number" value="${settings.minScale}">
			<p class="notes">${game.i18n.localize("pinfix.minScale.desc")}</p>
		</div>
		<div class="form-group">
			<label>${game.i18n.localize("pinfix.maxScale.name")}</label>
			<input type="text" name="flags.pinfix.maxScale" data-dtype="Number" value="${settings.maxScale}">
			<p class="notes">${game.i18n.localize("pinfix.maxScale.desc")}</p>
		</div>
		<div class="form-group">
			<label>${game.i18n.localize("pinfix.zoomFloor.name")}</label>
			<input type="text" name="flags.pinfix.zoomFloor" data-dtype="Number" value="${settings.zoomFloor}">
			<p class="notes">${game.i18n.localize("pinfix.zoomFloor.desc")}</p>
		</div>
		<div class="form-group">
			<label>${game.i18n.localize("pinfix.zoomCeil.name")}</label>
			<input type="text" name="flags.pinfix.zoomCeil" data-dtype="Number" value="${settings.zoomCeil}">
			<p class="notes">${game.i18n.localize("pinfix.zoomCeil.desc")}</p>
		</div>
		<div class="form-group">
			<label>${game.i18n.localize("pinfix.hudScale.name")}</label>
			<input type="text" name="flags.pinfix.hudScale" data-dtype="Number" value="${settings.hudScale}">
			<p class="notes">${game.i18n.localize("pinfix.hudScale.desc")}</p>
		</div>`;
	}

	/**
	 * Registers render Hooks for each HUD
	 *
	 * @static
	 * @memberof PinFixer
	 */
	static createHudHooks() {
		this.huds.forEach(hud => {
			Hooks.on(hud.hook, (...args) => this.renderHUD(hud.id, ...args));
		});
	}
}

/**
 * This is the Hooks section, hooks are registered here to call methods
 * of PinFixer with all arguments.
 */

Hooks.on("canvasPan", (...args) => PinFixer.canvasPan(...args));
Hooks.on("renderSceneConfig", (...args) => PinFixer.renderSceneConfig(...args));
Hooks.on("updateScene", (...args) => PinFixer.updateScene(...args));
PinFixer.createHudHooks();