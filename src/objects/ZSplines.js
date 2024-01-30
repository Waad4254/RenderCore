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

        const functionCoefficients_XYZ = [];
        const colors = [0.412, 0.204, 0.529, 1.0,
                        0.208, 0.631, 0.624, 1.0, 
                        0.69, 0.357, 0.635, 1.0, 
                        0.388, 0.539, 0.49, 1.0];
        const widths = [0.2,  0.0, 0.0, 0.0,
                        0.15, 0.0, 0.0, 0.0,
                        0.1,  0.0, 0.0, 0.0,
                        0.05, 0.0, 0.0, 0.0,];

        const numSegments = (points.length/6) - 1;

        //console.log("numSegments", numSegments);
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

            functionCoefficients_XYZ.push(functionCoefficients[0][0]);
            functionCoefficients_XYZ.push(functionCoefficients[0][1]);
            functionCoefficients_XYZ.push(functionCoefficients[0][2]);
            functionCoefficients_XYZ.push(functionCoefficients[0][3]);

            functionCoefficients_XYZ.push(functionCoefficients[1][0]);
            functionCoefficients_XYZ.push(functionCoefficients[1][1]);
            functionCoefficients_XYZ.push(functionCoefficients[1][2]);
            functionCoefficients_XYZ.push(functionCoefficients[1][3]);

            functionCoefficients_XYZ.push(functionCoefficients[2][0]);
            functionCoefficients_XYZ.push(functionCoefficients[2][1]);
            functionCoefficients_XYZ.push(functionCoefficients[2][2]);
            functionCoefficients_XYZ.push(functionCoefficients[2][3]);

        }

        const functionCoefficients_XYZTexture = new Texture(
            new Float32Array(functionCoefficients_XYZ), 
            Texture.WRAPPING.ClampToEdgeWrapping, 
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, 
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F, 
            Texture.FORMAT.RGBA, 
            Texture.TYPE.FLOAT,
            functionCoefficients_XYZ.length/4,
            1
        );
        functionCoefficients_XYZTexture._generateMipmaps = false;
        material.addInstanceData(functionCoefficients_XYZTexture);

        const ColorsTexture = new Texture(
            new Float32Array(colors), 
            Texture.WRAPPING.ClampToEdgeWrapping, 
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, 
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F, 
            Texture.FORMAT.RGBA, 
            Texture.TYPE.FLOAT,
            colors.length/4,
            1
        );
        ColorsTexture._generateMipmaps = false;
        material.addInstanceData(ColorsTexture);

        const WidthTexture = new Texture(
            new Float32Array(widths), 
            Texture.WRAPPING.ClampToEdgeWrapping, 
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, 
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F, 
            Texture.FORMAT.RGBA, 
            Texture.TYPE.FLOAT,
            widths.length/4,
            1
        );
        WidthTexture._generateMipmaps = false;
        material.addInstanceData(WidthTexture);


        const method = 1; 
        if(method == 1)// in case of methid 2? change the target vertex shader
        {
            // Quad 4 vertices
            const line = [0.0,0.0,0.0,
            0.0,0.0,0.0,
            0.0,0.0,0.0,
            0.0,0.0,0.0];
            geometry.vertices = Float32Attribute(line, 3);
            geometry.indices = Uint32Attribute([0, 1, 2, 2, 1, 3], 1);
        }
        else
        {
            const line = [];
            const index = [];
            for (let x = 0; x<=samples; x++)
            {
                line.push(x/samples);
                line.push(0.0);
                line.push(0.0);

                line.push(x/samples);
                line.push(0.0);
                line.push(0.0);

            }

            for (let x = 0; x<line.length/3; x+=2)
            {
                if(x+3 < line.length/3)
                {
                    index.push(x);
                    index.push(x+1);
                    index.push(x+2);
                    index.push(x+2);
                    index.push(x+1);
                    index.push(x+3);
                }
                
            }

            //console.log("index",line.length/3, index);

            geometry.vertices = Float32Attribute(line, 3);
            geometry.indices = Uint32Attribute(index, 1);
            samples = 1;
        }
        
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
        //console.log("Coefficients coefficientsMat", coefficientsMat );

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