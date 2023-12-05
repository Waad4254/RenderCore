/**
 * Created by Primoz on 6. 08. 2016.
 */

import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';
import {ZSplinesMaterial} from '../materials/ZSplinesMaterial.js';
import {Float32Attribute, Uint32Attribute} from "../core/BufferAttribute.js";
import {Texture, FRONT_AND_BACK_SIDE } from '../RenderCore.js';

export class ZSplines extends Mesh {
	constructor(points, samples, width) {


        const material = new ZSplinesMaterial();
        const geometry = new Geometry();

        const functionCoefficients_X = [];
        const functionCoefficients_Y = [];
        const functionCoefficients_Z = [];

        const numSegments = (points.length/6) - 1;

        material.setUniform("numSegments", numSegments);
        material.setUniform("numSubSegments", samples);
        material.setUniform("width", width);
        material.addSBFlag('INSTANCED');

        for (let i = 0; i < numSegments; ++i) {
            const offset = i * 6;
            const p1 = [points[offset + 0], points[offset + 1], points[offset + 2]];
            const p2 = [points[offset + 3], points[offset + 4], points[offset + 5]];
            const p3 = [points[offset + 6], points[offset + 7], points[offset + 8]];
            const p4 = [points[offset + 9], points[offset + 10], points[offset + 11]];

            const functionCoefficients = ZSplines.getCurveFunctionCoefficients(p1, p2, p3, p4);

            functionCoefficients_X.push(functionCoefficients[0][0]);
            functionCoefficients_X.push(functionCoefficients[0][1]);
            functionCoefficients_X.push(functionCoefficients[0][2]);
            functionCoefficients_X.push(functionCoefficients[0][3]);

            functionCoefficients_Y.push(functionCoefficients[1][0]);
            functionCoefficients_Y.push(functionCoefficients[1][1]);
            functionCoefficients_Y.push(functionCoefficients[1][2]);
            functionCoefficients_Y.push(functionCoefficients[1][3]);

            functionCoefficients_Z.push(functionCoefficients[2][0]);
            functionCoefficients_Z.push(functionCoefficients[2][1]);
            functionCoefficients_Z.push(functionCoefficients[2][2]);
            functionCoefficients_Z.push(functionCoefficients[2][3]);

        }

        const functionCoefficients_XTexture = new Texture(
            new Float32Array(functionCoefficients_X), 
            Texture.WRAPPING.ClampToEdgeWrapping, 
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, 
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F, 
            Texture.FORMAT.RGBA, 
            Texture.TYPE.FLOAT,
            functionCoefficients_X.length/4,
            1
        );
        functionCoefficients_XTexture._generateMipmaps = false;
        material.addInstanceData(functionCoefficients_XTexture);

        const functionCoefficients_YTexture = new Texture(
            new Float32Array(functionCoefficients_Y), 
            Texture.WRAPPING.ClampToEdgeWrapping, 
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, 
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F, 
            Texture.FORMAT.RGBA, 
            Texture.TYPE.FLOAT,
            functionCoefficients_Y.length/4,
            1
        );
        functionCoefficients_YTexture._generateMipmaps = false;
        material.addInstanceData(functionCoefficients_YTexture);

        const functionCoefficients_ZTexture = new Texture(
            new Float32Array(functionCoefficients_Z), 
            Texture.WRAPPING.ClampToEdgeWrapping, 
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, 
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F, 
            Texture.FORMAT.RGBA, 
            Texture.TYPE.FLOAT,
            functionCoefficients_Z.length/4,
            1
        );
        functionCoefficients_ZTexture._generateMipmaps = false;
        material.addInstanceData(functionCoefficients_ZTexture);

        // Quad 4 vertices
        const line = [0.0,0.0,0.0,
                      0.0,0.0,0.0,
                      0.0,0.0,0.0,
                      0.0,0.0,0.0];
        geometry.vertices = Float32Attribute(line, 3);
        geometry.indices = Uint32Attribute([0, 1, 2, 2, 1, 3], 1);
        material.side = FRONT_AND_BACK_SIDE;


		// Super Mesh
		super(geometry, material);

		this.type = "Curve";
        this.frustumCulled = false;
        this.pickable = true;
        this.instancedTranslation = true;
        this.instanceCount = numSegments * samples;
	}

    
    static getCurveFunctionCoefficients(positionA, tangentA, positionB, tangentB)
    {
        
        const d = Math.sqrt(Math.pow(tangentA[0] - tangentB[0], 2) + Math.pow(tangentA[1] - tangentB[1], 2) + Math.pow(tangentA[2] - tangentB[2], 2));

        const tension = 1;
        const T1 = tension*d, T2 = tension*d;

        const coefficientsMat = [];

        for (let i=0; i<3; ++i)
        {
            const P = tangentB[i] - tangentA[i];
            const Q = T1*positionA[i];
            const R = T2*positionB[i] - 2*P + Q;

            coefficientsMat[i] = [];
            coefficientsMat[i][0] = tangentA[i];
            coefficientsMat[i][1] = Q;
            coefficientsMat[i][2] = P - Q - R;
            coefficientsMat[i][3] = R;
        }
        console.log("Coefficients coefficientsMat", coefficientsMat );

        return coefficientsMat;
    }

	static fromJson(data, geometry, material) {
		// Create mesh object
		var line = new Line(geometry, material);

		// Import Object3D parameters
		line = super.fromJson(data, undefined, undefined, line);

		return line;
	}

};