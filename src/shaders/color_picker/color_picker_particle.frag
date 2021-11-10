#version 300 es
precision mediump float;
precision highp int;


uniform uint pickingID;

layout(location = 0) out uint objID;


void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float pct = dot(cxy, cxy);
    if (pct > 1.0) {
        discard; //performance trap
        //color = vec4(1.0, 1.0, 1.0, 0.0);
    }


    objID = pickingID;
}
