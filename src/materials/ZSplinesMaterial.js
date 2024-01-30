import { Color } from '../RenderCore.js';
import {CustomShaderMaterial} from './CustomShaderMaterial.js';


export class ZSplinesMaterial extends CustomShaderMaterial {
    constructor(programName = "ZSplines", uniforms = {}, attributes = {}, args = {}){
        super(programName, uniforms, attributes);

        this.type = "ZSplinesMaterial";
        this._uniforms = uniforms;
		this._attributes = attributes;

		this._emissive = new Color(Math.random() * 0x000000);
		this._color = new Color(0xffc2ce);
    }
    
	set emissive(val) {
		if (!val.equals(this._emissive)) {
			this._emissive = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	/**
	 * Set color of the material.
	 *
	 * @param val Color to be set.
	 */
	set color(val) {
		if (!val.equals(this._color)) {
			this._color = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}

	get emissive() { return this._emissive; }

	/**
	 * Get color of the material.
	 *
	 * @returns Color of the material.
	 */
	get color() { return this._color; }

	/**
	 * Update the material with settings from data.
	 *
	 * @param data Update data.
	 */
	update(data) {
		super.update(data);

		for (var prop in data) {
			switch (prop) {
				case "emissive":
					this._emissive = data.emissive;
					delete data.color;
					break;
				case "color":
					this._color = data.color;
					delete data.color;
					break;
			}
		}
	}
}