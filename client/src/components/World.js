
import React, {Component} from 'react'
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";


import './World.css'

import { Shaders, Node, GLSL } from "gl-react";
import { Surface } from "gl-react-dom";


THREE.BufferGeometry.prototype.tripleFace = tripleFace;
function tripleFace(){
  let geometry = this;
  let pos = geometry.attributes.position;
  if (geometry.index != null) {
    console.log("Works for non-indexed geometries!");
    return;
  }
  
  let facesCount = pos.count / 3;
  
  let pts = [];
  let triangle = new THREE.Triangle();
  let a = new THREE.Vector3(), b = new THREE.Vector3, c = new THREE.Vector3();
  for(let i = 0; i < facesCount; i++){
    a.fromBufferAttribute(pos, i * 3 + 0);
    b.fromBufferAttribute(pos, i * 3 + 1);
    c.fromBufferAttribute(pos, i * 3 + 2);
    triangle.set(a, b, c);
    let o = new THREE.Vector3();
    triangle.getMidpoint(o);
    
    // make it tetrahedron-like
    let l = a.distanceTo(b);
    let h = Math.sqrt(3) / 2 * l * 0.125;// scale it at your will
                                        // remove 0.125 to get tetrahedrons
    let d = o.clone().normalize().setLength(h); 
    o.add(d);
    
    pts.push(
      o.clone(), a.clone(), b.clone(),
      o.clone(), b.clone(), c.clone(),
      o.clone(), c.clone(), a.clone()
    );
  }
  
  let g = new THREE.BufferGeometry().setFromPoints(pts);
  g.computeVertexNormals()
  return g;
}

const shaders = Shaders.create({
	world: {
		frag: GLSL`
		    //	Simplex 4D Noise 
		//	by Ian McEwan, Ashima Arts
		//
		vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
		float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
		vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
		float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

		vec4 grad4(float j, vec4 ip){
		  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
		  vec4 p,s;

		  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
		  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
		  s = vec4(lessThan(p, vec4(0.0)));
		  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

		  return p;
		}

		float snoise(vec4 v){
		  const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
		                        0.309016994374947451); // (sqrt(5) - 1)/4   F4
		// First corner
		  vec4 i  = floor(v + dot(v, C.yyyy) );
		  vec4 x0 = v -   i + dot(i, C.xxxx);

		// Other corners

		// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
		  vec4 i0;

		  vec3 isX = step( x0.yzw, x0.xxx );
		  vec3 isYZ = step( x0.zww, x0.yyz );
		//  i0.x = dot( isX, vec3( 1.0 ) );
		  i0.x = isX.x + isX.y + isX.z;
		  i0.yzw = 1.0 - isX;

		//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
		  i0.y += isYZ.x + isYZ.y;
		  i0.zw += 1.0 - isYZ.xy;

		  i0.z += isYZ.z;
		  i0.w += 1.0 - isYZ.z;

		  // i0 now contains the unique values 0,1,2,3 in each channel
		  vec4 i3 = clamp( i0, 0.0, 1.0 );
		  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
		  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

		  //  x0 = x0 - 0.0 + 0.0 * C 
		  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
		  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
		  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
		  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

		// Permutations
		  i = mod(i, 289.0); 
		  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
		  vec4 j1 = permute( permute( permute( permute (
		             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
		           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
		           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
		           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
		// Gradients
		// ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
		// 7*7*6 = 294, which is close to the ring size 17*17 = 289.

		  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

		  vec4 p0 = grad4(j0,   ip);
		  vec4 p1 = grad4(j1.x, ip);
		  vec4 p2 = grad4(j1.y, ip);
		  vec4 p3 = grad4(j1.z, ip);
		  vec4 p4 = grad4(j1.w, ip);

		// Normalise gradients
		  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
		  p0 *= norm.x;
		  p1 *= norm.y;
		  p2 *= norm.z;
		  p3 *= norm.w;
		  p4 *= taylorInvSqrt(dot(p4,p4));

		// Mix contributions from the five corners
		  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
		  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
		  m0 = m0 * m0;
		  m1 = m1 * m1;
		  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
		               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

		}
		`
	}
})

class World extends Component {

	componentDidMount() {
		let scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff);
		let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
		camera.position.set(0, 0, 15);
		let renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(renderer.domElement);

		let controls = new OrbitControls(camera, renderer.domElement);
		controls.enablePan = false;
		controls.autoRotate = true;
		controls.autoRotateSpeed = 1;

		let light = new THREE.DirectionalLight(0xffffff, 1);
		light.position.setScalar(1);
		scene.add(
		  light, 
		  new THREE.AmbientLight(0xffffff, 0.05),
		  new THREE.HemisphereLight( 0xff007f, 0x007fff)
		);

		// 148 // ${simplexNoise}
		let g = new THREE.IcosahedronGeometry(5, 20).tripleFace();
		let m = new THREE.MeshStandardMaterial({ 
		  color: 0x7f7f7f, 
		  metalness: 0.25,
		  roughness: 0.75,
		  onBeforeCompile: shader => {
		    shader.uniforms.time = m.userData.uniforms.time;
		    shader.vertexShader = `
		      uniform float time;
		      attribute float onMove;
		      attribute vec3 center;
					varying vec3 vCenter;
		      
		      
		      
		      ${shader.vertexShader}
		    `.replace(
		      `#include <fog_vertex>`,
		      `#include <fog_vertex>
		        vCenter = center;
		      `
		    ).replace(
		      `#include <begin_vertex>`,
		      `#include <begin_vertex>
		        
		       vec3 tN = normalize(transformed);
		       float N = snoise(vec4(tN * 4., time));
		       N = N * 0.5 + 0.5;
		       N = pow(N, 8.);
		       transformed += tN * N * 4. * onMove;
		      
		      `
		    );
		    console.log(shader.vertexShader);
		    shader.fragmentShader = `
		      varying vec3 vCenter;
		      
		      ${shader.fragmentShader}
		    `.replace(
		      `#include <dithering_fragment>`,
		      `#include <dithering_fragment>
		        
		        float thickness = 1.;
		        vec3 afwidth = fwidth( vCenter.xyz );
		        vec3 edge3 = smoothstep( ( thickness - 1.0 ) * afwidth, thickness * afwidth, vCenter.xyz );
		        float edge = 1. - min( min( edge3.x, edge3.y ), edge3.z );
		        
		        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1), edge);
		      `
		    );
		    //console.log(shader.fragmentShader);
		  }
		});
		m.userData = {
		  uniforms: {
		    time: {value: 0} 
		  }
		}
		let o = new THREE.Mesh(g, m);
		scene.add(o);

		window.addEventListener("resize", () => {
		  camera.aspect = window.innerWidth / window.innerHeight;
		  camera.updateProjectionMatrix();
		  renderer.setSize(window.innerWidth, window.innerHeight);
		});

		let clock = new THREE.Clock();

		renderer.setAnimationLoop(() => {
		  let t = clock.getElapsedTime() * 0.1;
		  m.userData.uniforms.time.value = t;
		  controls.update();
		  renderer.render(scene, camera);
		});

		function tripleFace() {
		  let geometry = this;
		  let pos = geometry.attributes.position;
		  if (geometry.index != null) {
		    console.log("Works for non-indexed geometries!");
		    return;
		  }

		  let facesCount = pos.count / 3;

		  let pts = [];
		  let onMove = [];
		  let triangle = new THREE.Triangle();
		  let a = new THREE.Vector3(),
		    b = new THREE.Vector3(),
		    c = new THREE.Vector3();
		  for (let i = 0; i < facesCount; i++) {
		    a.fromBufferAttribute(pos, i * 3 + 0);
		    b.fromBufferAttribute(pos, i * 3 + 1);
		    c.fromBufferAttribute(pos, i * 3 + 2);
		    triangle.set(a, b, c);
		    let o = new THREE.Vector3();
		    triangle.getMidpoint(o);

		    // make it tetrahedron-like
		    let l = a.distanceTo(b);
		    let h = 0; //(Math.sqrt(3) / 2) * l; // scale it at your will
		    let d = o.clone().normalize().setLength(h);
		    o.add(d);

		    pts.push(
		      o.clone(), a.clone(), b.clone(),
		      o.clone(), b.clone(), c.clone(),
		      o.clone(), c.clone(), a.clone()
		    );
		    onMove.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
		  }

		  let g = new THREE.BufferGeometry().setFromPoints(pts);
		  g.setAttribute("onMove", new THREE.Float32BufferAttribute(onMove, 1));
		  g.computeVertexNormals();
		  setupAttributes(g);
		  return g;
		}

		function setupAttributes(geometry) {
		  const vectors = [
		    new THREE.Vector3(1, 0, 0),
		    new THREE.Vector3(0, 1, 0),
		    new THREE.Vector3(0, 0, 1)
		  ];

		  const position = geometry.attributes.position;
		  const centers = new Float32Array(position.count * 3);

		  for (let i = 0, l = position.count; i < l; i++) {
		    vectors[i % 3].toArray(centers, i * 3);
		  }

		  geometry.setAttribute("center", new THREE.BufferAttribute(centers, 3));
		}
	}

	render() {
		return (
		<div>
			<Surface>
				<Node shader={shaders.world}/>
			</Surface>
		</div>
		)
	}
}

export default World;