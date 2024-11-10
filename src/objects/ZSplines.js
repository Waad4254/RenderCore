/**
 * Created by Primoz on 6. 08. 2016.
 */

import { Mesh } from './Mesh.js';
import { Geometry } from './Geometry.js';
import { ZSplinesMaterial } from '../materials/ZSplinesMaterial.js';
import { Float32Attribute, Uint32Attribute } from "../core/BufferAttribute.js";
import { Texture, FRONT_AND_BACK_SIDE } from '../RenderCore.js';

export class ZSplines extends Mesh {

    constructor(points, time, energy, samples, width, limitT_min, limitT_max, colorsPassed, trackImportance, masked = false, main = false) {


        const material = new ZSplinesMaterial();
        const geometry = new Geometry();

        const pattern0 = [];

        //console.log("loadData"); 
        
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
            [   255/255.0, 0/255.0, 0/255.0, 1.0,
                0/255.0, 255/255.0, 0/255.0, 1.0,
                0/255.0, 0/255.0, 255/255.0, 1.0];
        const widths = 
            [10.9,
            10.9,
            10.9,
            10.9];

        const radians = 
        [Math.PI / 2.0,
        Math.PI / 3.0,
        Math.PI / 6.0,
            0.0,
        -Math.PI / 6.0,
        -Math.PI / 3.0,
        -Math.PI / 2.0];


        //******************************
        

        let numSegments = ((points.length / 12));

        //console.log("numSegments", numSegments);
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

        // 4050 , colors 1350, time 1350, energy 1350  46
        let coeTextureW = functionCoefficients_XYZ.length / 4;
        let coetextureMax = 4050;
        let coeTextureH = 1;
        if (coeTextureW > coetextureMax) {
            coeTextureH = Math.ceil(coeTextureW / coetextureMax);
            coeTextureW = coetextureMax;
        }
        //console.log("coe textureMax", coetextureMax);
        //console.log("coeTextureW before", functionCoefficients_XYZ.length / 4);
        //console.log("coeTextureW after", coeTextureW);
        //console.log("coeTextureH after", coeTextureH);

        for(let i = functionCoefficients_XYZ.length / 4; i< coeTextureW * coeTextureH; i++)
        {
            functionCoefficients_XYZ.push(0.0);
            functionCoefficients_XYZ.push(0.0);
            functionCoefficients_XYZ.push(0.0);
            functionCoefficients_XYZ.push(0.0);

        }
        //console.log("coeTextureW before", functionCoefficients_XYZ.length / 12, numSegments);

        material.setUniform("numSegments", functionCoefficients_XYZ.length / 12);
        numSegments =  functionCoefficients_XYZ.length / 12;


        const functionCoefficients_XYZTexture = new Texture(
            new Float32Array(functionCoefficients_XYZ),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F,
            Texture.FORMAT.RGBA,
            Texture.TYPE.FLOAT,
            coeTextureW,
            coeTextureH,
            main
        );
        functionCoefficients_XYZTexture._generateMipmaps = false;
        material.addInstanceData(functionCoefficients_XYZTexture);

        // 16384
        let colorsTextureW = colorsPassed.length / 4;
        let textureMax = 1350;
        let colorsTextureH = 1;
        if(colorsTextureW > textureMax)
        {
            colorsTextureH = Math.ceil(colorsTextureW / textureMax);
            colorsTextureW = textureMax;
        }
        //console.log("colors textureMax", textureMax);
        //console.log("colorsTextureW before", colorsPassed.length / 4);
        //console.log("colorsTextureW after", colorsTextureW);
        //console.log("colorsTextureH after", colorsTextureH);

        let count = 0;
        for(let i = colorsPassed.length / 4; i< colorsTextureW * colorsTextureH; i++)
        {
            colorsPassed.push(0.0);
            colorsPassed.push(0.0);
            colorsPassed.push(0.0);
            colorsPassed.push(0.0);

            count+=4;
        }
        //console.log("colors count", count, (colorsPassed.length+count)/4);


        const ColorsTexture = new Texture(
            new Float32Array(colorsPassed),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.LinearFilter,
            Texture.FILTER.LinearFilter,
            Texture.FORMAT.RGBA16F,
            Texture.FORMAT.RGBA,
            Texture.TYPE.FLOAT,
            colorsTextureW,
            colorsTextureH,
            main
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
            1,
            main
        );
        WidthTexture._generateMipmaps = false;
        material.addInstanceData(WidthTexture);

        // 16384
        let timeTextureW = time.length / 3;
        let timetextureMax = 1350;
        let timeTextureH = 1;
        if (timeTextureW > timetextureMax) {
            timeTextureH = Math.ceil(timeTextureW / timetextureMax);
            timeTextureW = timetextureMax;
        }
        //console.log("time textureMax", timetextureMax);
        //console.log("timeTextureW before", time.length / 3);
        //console.log("timeTextureW after", timeTextureW);
        //console.log("timeTextureH after", timeTextureH);

        for(let i = time.length / 3; i< timeTextureW * timeTextureH; i++)
        {
            time.push(0.0);
            time.push(0.0);
            time.push(0.0);

        }

        const TimeTexture = new Texture(
            new Float32Array(time),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGB32F,
            Texture.FORMAT.RGB,
            Texture.TYPE.FLOAT,
            timeTextureW,
            timeTextureH,
            main
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
            1,
            main
        );
        RadiansTexture._generateMipmaps = false;
        material.addInstanceData(RadiansTexture);


        // 16384
        let energyTextureW = energy.length / 3;
        let energytextureMax = 1350;
        let energyTextureH = 1;
        if (energyTextureW > energytextureMax) {
            energyTextureH = Math.ceil(energyTextureW / energytextureMax);
            energyTextureW = energytextureMax;
        }
        //console.log("energy textureMax", energytextureMax);
        //console.log("energyTextureW before", energy.length / 3);
        //console.log("energyTextureW after", energyTextureW);
        //console.log("energyTextureH after", energyTextureH);

        for(let i = energy.length / 3; i< energyTextureW * energyTextureH; i++)
        {
            energy.push(0.0);
            energy.push(0.0);
            energy.push(0.0);

        }

        const EnergyTexture = new Texture(
            new Float32Array(energy),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGB32F,
            Texture.FORMAT.RGB,
            Texture.TYPE.FLOAT,
            energyTextureW,
            energyTextureH,
            main
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
            1,
            main
        );
        PatternTexture._generateMipmaps = false;
        material.addInstanceData(PatternTexture);

        const ColorsRealTexture = new Texture(
            new Float32Array(colors),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.LinearFilter,
            Texture.FILTER.LinearFilter,
            Texture.FORMAT.RGBA16F,
            Texture.FORMAT.RGBA,
            Texture.TYPE.FLOAT,
            colors.length / 4,
            1,
            main
        );
        ColorsRealTexture._generateMipmaps = false;
        material.addInstanceData(ColorsRealTexture);


        const ImportanceTexture = new Texture(
            new Float32Array(trackImportance),
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter,
            Texture.FILTER.NearestFilter,
            Texture.FORMAT.R16F,
            Texture.FORMAT.RED,
            Texture.TYPE.FLOAT,
            trackImportance.length,
            1,
            main
        );
        ImportanceTexture._generateMipmaps = false;
        material.addInstanceData(ImportanceTexture);

        const line = [];
        const index = [];
        const texCoords = [];
        for (let x = 0; x < (samples+1); x++) {
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

        //console.log("vertices",line);

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

        //console.log("Resuilts: Number of vertices", (line.length / 3) * 12507, functionCoefficients_XYZ.length / 12);

         console.log("Resuilts: Number of vertices per track", line.length / 3);

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
        this.masked = masked;
        this.importance = trackImportance[0];
    }


    static getCurveFunctionCoefficients(positionA, tangentA, positionB, tangentB) {

        const d = Math.sqrt(Math.pow(positionA[0] - positionB[0], 2) + Math.pow(positionA[1] - positionB[1], 2) + Math.pow(positionA[2] - positionB[2], 2));

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

    setEnergyLimitMax(energy) {
        this.material.setUniform("limitE_max", energy);
    }

    setEnergyLimitMin(energy) {
        this.material.setUniform("limitE_min", energy);
    }

    setAnimationPattern(intPattern) {
        this.material.setUniform("pattern", intPattern);
    }

    setColors(colors) {
        this.material.setUniform("colors", colors);
    }

    setTEnergyMax(maxE) { 
        this.material.setUniform("energyMax", maxE);
    }

    setWidth(width) {
        this.material.setUniform("width", width);
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