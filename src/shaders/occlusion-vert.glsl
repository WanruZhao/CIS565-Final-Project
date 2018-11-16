#version 300 es

uniform mat4 u_Model;       
uniform mat4 u_ModelInvTr;  
uniform mat4 u_ViewProj; 


in vec4 vs_Pos;             // The array of vertex positions passed to the shader
in vec4 vs_Nor;             // The array of vertex normals passed to the shader
in vec4 vs_Col;             // The array of vertex colors passed to the shader.




void main()
{

    vec4 modelposition = u_Model * vs_Pos;   // Temporarily store the transformed vertex positions for use below

    gl_Position = u_ViewProj * modelposition;// gl_Position is a built-in variable of OpenGL which is
                                             // used to render the final positions of the geometry's vertices
}
