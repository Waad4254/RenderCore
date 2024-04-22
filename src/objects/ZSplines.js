/**
 * Created by Primoz on 6. 08. 2016.
 */

import { Mesh } from './Mesh.js';
import { Geometry } from './Geometry.js';
import { ZSplinesMaterial } from '../materials/ZSplinesMaterial.js';
import { Float32Attribute, Uint32Attribute } from "../core/BufferAttribute.js";
import { Texture, FRONT_AND_BACK_SIDE } from '../RenderCore.js';

export class ZSplines extends Mesh {

    constructor(points, time, energy, samples, width, limitT_min, limitT_max) {


        const material = new ZSplinesMaterial();
        const geometry = new Geometry();

        const pattern0 = [];

        let gap = 1;
        let fill = 2;
        let full = 1000;

        while(full > 0)
        {
            for(let j = 0; j< gap > 0; j++)
            {
                pattern0.push(0.0);
                full--;
            }
            for(let i = 0; i< fill > 0; i++)
            {
                pattern0.push(1.0);
                full--;
            }
        }

        const functionCoefficients_XYZ = [];
        const colors = 
            [    12/255.0, 0/255.0, 143/255.0, 1.0,
                75/255.0, 44/255.0, 160/255.0, 1.0,
                113/255.0, 82/255.0, 177/255.0, 1.0,
                146/255.0, 120/255.0, 193/255.0, 1.0,
                179/255.0, 159/255.0, 209/255.0, 1.0,
                210/255.0, 199/255.0, 225/255.0, 1.0,
                241/255.0, 241/255.0, 241/255.0, 1.0,
                246/255.0, 211/255.0, 205/255.0, 1.0,
                247/255.0, 182/255.0, 171/255.0, 1.0,
                245/255.0, 152/255.0, 137/255.0, 1.0,
                239/255.0, 121/255.0, 105/255.0, 1.0,
                232/255.0, 87/255.0, 74/255.0, 1.0,
                222/255.0, 44/255.0, 44/255.0, 1.0
                ];
        const widths = 
            [0.01,
            0.01,
            0.01,
            0.01];

        const radians = 
        [Math.PI / 2.0,
        Math.PI / 3.0,
        Math.PI / 6.0,
            0.0,
        -Math.PI / 6.0,
        -Math.PI / 3.0,
        -Math.PI / 2.0];


        //******************************
        

        const numSegments = ((points.length / 6)) / 2;

        console.log("numSegments", numSegments);
        material.setUniform("numSegments", numSegments);
        material.setUniform("samples", samples * 1.0);
        material.setUniform("limitT_min", limitT_min);
        material.setUniform("limitT_max", limitT_max);
        material.setUniform("width", width);
        material.addSBFlag('INSTANCED');

        for (let i = 0; i < numSegments; ++i) {
            const offset = i * 12;
            const p1 = [points[offset + 0], points[offset + 1], points[offset + 2]];
            const p2 = [points[offset + 3], points[offset + 4], points[offset + 5]];
            const p3 = [points[offset + 6], points[offset + 7], points[offset + 8]];
            const p4 = [points[offset + 9], points[offset + 10], points[offset + 11]];

            //console.log("p1", p1, "p2",p2, "p3",p3, "p4",p4);

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
            functionCoefficients_XYZ.length / 4,
            1
        );
        functionCoefficients_XYZTexture._generateMipmaps = false;
        material.addInstanceData(functionCoefficients_XYZTexture);

        const ColorsTexture = new Texture(
            new Float32Array(colors),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.LinearFilter,
            Texture.FILTER.LinearFilter,
            Texture.FORMAT.RGBA16F,
            Texture.FORMAT.RGBA,
            Texture.TYPE.FLOAT,
            colors.length / 4,
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
            Texture.FORMAT.R16F, // No RG16F ? 
            Texture.FORMAT.RED,
            Texture.TYPE.FLOAT,
            widths.length ,
            1
        );
        WidthTexture._generateMipmaps = false;
        material.addInstanceData(WidthTexture);

        console.log("time.length / 3", time.length / 3);
        const TimeTexture = new Texture(
            new Float32Array(time),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGB32F,
            Texture.FORMAT.RGB,
            Texture.TYPE.FLOAT,
            time.length / 3,
            1
        );
        TimeTexture._generateMipmaps = false;
        material.addInstanceData(TimeTexture);

        const RadiansTexture = new Texture(
            new Float32Array(radians),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.LinearFilter,
            Texture.FILTER.LinearFilter,
            Texture.FORMAT.R16F,
            Texture.FORMAT.RED,
            Texture.TYPE.FLOAT,
            radians.length,
            1
        );
        RadiansTexture._generateMipmaps = false;
        material.addInstanceData(RadiansTexture);

        const EnergyTexture = new Texture(
            new Float32Array(energy),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGB32F,
            Texture.FORMAT.RGB,
            Texture.TYPE.FLOAT,
            energy.length / 3,
            1
        );
        EnergyTexture._generateMipmaps = false;
        material.addInstanceData(EnergyTexture);


        const PatternTexture = new Texture(
            new Float32Array(pattern0),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.R16F,
            Texture.FORMAT.RED,
            Texture.TYPE.FLOAT,
            pattern0.length,
            1
        );
        PatternTexture._generateMipmaps = false;
        material.addInstanceData(PatternTexture);


        const line = [];
        const index = [];
        const texCoords = [];
        for (let x = 0; x < samples; x++) {
            if (true/*x == 0 || x==1*/) {
                line.push(x / samples);
                line.push(0.0);
                line.push(0.0);

                line.push(x / samples);
                line.push(0.0);
                line.push(0.0);

                if(x % 2 == 0)
                {
                    texCoords.push(0.0);
                    texCoords.push(0.0);
    
                    texCoords.push(0.0);
                    texCoords.push(1.0);
                }
                else
                {
                    texCoords.push(1.0);
                    texCoords.push(0.0);

                    texCoords.push(1.0);
                    texCoords.push(1.0);
                }
                

            }


        }

        for (let x = 0; x < line.length / 3; x += 2) {
            if (x + 3 < line.length / 3) {
                index.push(x);
                index.push(x + 1);
                index.push(x + 2);
                index.push(x + 2);
                index.push(x + 1);
                index.push(x + 3);
            }

        }



        console.log("index", index, "line", line);

        geometry.vertices = Float32Attribute(line, 3);
        geometry.indices = Uint32Attribute(index, 1);
        geometry.uv = Float32Attribute(texCoords, 2);

        material.side = FRONT_AND_BACK_SIDE;


        // Super Mesh
        super(geometry, material);

        this.type = "Curve";
        this.frustumCulled = false;
        this.pickable = true;
        this.instancedTranslation = true;
        this.instanceCount = numSegments /** samples*/;
        this.samples = samples;
        this.time = 0;
        this.gap = gap;
        this.fill = fill;
    }


    static getCurveFunctionCoefficients(positionA, tangentA, positionB, tangentB) {

        const d = Math.sqrt(Math.pow(positionA[0] - positionB[0], 2) + Math.pow(positionA[1] - positionB[1], 2) + Math.pow(positionA[2] - positionB[2], 2));

        //console.log("dis", d);

        /*
        const dotProduct = tangentA[0] * tangentB[0] + tangentA[1] * tangentB[1] + tangentA[2] * tangentB[2];
        const normA = Math.sqrt(Math.pow(tangentA[0], 2) + Math.pow(tangentA[1], 2) + Math.pow(tangentA[2], 2));
        const normB = Math.sqrt(Math.pow(tangentB[0], 2) + Math.pow(tangentB[1], 2) + Math.pow(tangentB[2], 2));
        const theta = (Math.acos(dotProduct / (normA * normB))) * 180 / Math.PI;
        if (theta > 90) console.log("theta", theta);
        */

        const tension = 1;
        const tension2 = 1;
        const T1 = tension * d, T2 = tension2 * d;

        const coefficientsMat = [];

        for (let i = 0; i < 3; ++i) {
            const P = positionB[i] - positionA[i];
            const Q = T1 * tangentA[i];
            const R = T2 * tangentB[i] - 2 * P + Q;

            coefficientsMat[i] = [];
            coefficientsMat[i][0] = positionA[i];
            coefficientsMat[i][1] = Q;
            coefficientsMat[i][2] = P - Q - R;
            coefficientsMat[i][3] = R;
        }
        return coefficientsMat;
    }

    static fromJson(data, geometry, material) {
        // Create mesh object
        var line = new Line(geometry, material);

        // Import Object3D parameters
        line = super.fromJson(data, undefined, undefined, line);

        return line;
    }

    setTimeLimitMax(time) {
        this.material.setUniform("limitT_max", time);
    }

    setTimeLimitMin(time) {
        this.material.setUniform("limitT_min", time);
    }

    setAnimationPattern(intPattern) {
        this.material.setUniform("pattern", intPattern);
    }

    setGapSize(size) {

        let gap = size;
        this.gap = gap;
        let fill = this.fill;
        let full = 1000;

        const newPattern = [];

        while(full > 0)
        {
            for(let j = 0; j< gap > 0; j++)
            {
                newPattern.push(0.0);
                full--;
            }
            for(let i = 0; i< fill > 0; i++)
            {
                newPattern.push(1.0);
                full--;
            }
        }

        const PatternTexture = new Texture(
            new Float32Array(newPattern),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.R16F,
            Texture.FORMAT.RED,
            Texture.TYPE.FLOAT,
            newPattern.length,
            1
        );
        PatternTexture._generateMipmaps = false;

        this.material.updateInstanceData(6, PatternTexture);
        
    }

    setFillSize(size) {

        let gap = this.gap;
        let fill = size;
        this.fill = fill;
        let full = 1000;

        const newPattern = [];

        while(full > 0)
        {
            for(let j = 0; j< gap > 0; j++)
            {
                newPattern.push(0.0);
                full--;
            }
            for(let i = 0; i< fill > 0; i++)
            {
                newPattern.push(1.0);
                full--;
            }
        }

        const PatternTexture = new Texture(
            new Float32Array(newPattern),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.R16F,
            Texture.FORMAT.RED,
            Texture.TYPE.FLOAT,
            newPattern.length,
            1
        );
        PatternTexture._generateMipmaps = false;

        this.material.updateInstanceData(6, PatternTexture);
        
    }

};