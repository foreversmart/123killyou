// Adapted from Tidewater, Copyright (c) 2026 DRG Software Solutions LLC (MIT).
// Full license: docs/tidewater_license.txt.
struct VegRosette { d: f32, bright: f32, cell: f32 };
fn vegRosette( st: vec2f, G: f32, nLeaves: f32, width: f32, rot: f32 ) -> VegRosette {
	let cuv = st * G;
	let cell = floor( cuv );
	let h1 = vegHash12( cell + rot * 17.3 );
	let h2 = vegHash12( cell * 1.7 + rot * 31.1 + 5.2 );
	let h3 = vegHash12( cell * 2.3 + rot * 7.7 + 1.9 );
	// whorls of different sizes, off the cell centres; some cells stay empty (sky holes)
	let sc = mix( 0.62, 1.05, h2 ) * select( 1.0, 0.001, h3 < 0.2 );
	let off = vec2f( h1 - 0.5, h3 - 0.5 ) * 0.34;
	let p = ( fract( cuv ) - 0.5 - off ) * 2.0 / sc;
	let r = length( p );
	let ang = atan2( p.y, p.x ) + rot + h1 * 6.2832;
	let sector = ang * ( nLeaves / 6.2832 );
	let k = floor( sector + 0.5 );
	// irregular leaf spacing and lengths so clusters don't read as flowers
	let lr = vegHash12( vec2f( k, h1 * 13.7 ) );
	let jit = ( lr - 0.5 ) * 0.8;
	let L = mix( 0.5, 1.0, fract( lr * 7.13 ) );
	// each blade curves a little to one side (leaves, not a star)
	let curve = ( fract( lr * 3.31 ) - 0.5 ) * 0.9;
	let da = ( sector - k - jit ) * ( 6.2832 / nLeaves ) - curve * ( r / L ) * ( r / L ) * 0.35;
	let along = r * cos( da );
	let across = abs( r * sin( da ) );
	let x = along / L;
	let bx = clamp( ( x - 0.18 ) / 0.82, 0.0, 1.0 ); // blade after a short petiole
	// obovate (widest beyond the middle) with a short pointed tip
	let shape = pow( max( sin( pow( bx, 0.62 ) * 3.14159 ), 0.0 ), 0.8 ) * ( smoothstep( 1.0, 0.86, bx ) * 0.25 + 0.75 );
	let hw = shape * width * L;
	let inBlade = x > 0.16 && x < 1.0;
	let dBlade = select( -1.0, hw - across, inBlade );
	let dPet = select( -1.0, 0.012 - across, x < 0.2 );
	var o: VegRosette;
	o.d = max( dBlade, dPet );
	let vein = smoothstep( 0.03, 0.0, across ) * smoothstep( 0.05, 0.25, bx ) * smoothstep( 1.0, 0.7, bx );
	o.bright = ( ( h1 * 0.7 + lr * 0.3 ) * 0.22 + 0.88 ) * mix( 0.82, 1.08, bx ) * ( vein * 0.09 + 1.0 );
	o.cell = h1 * 0.7 + lr * 0.3;
	return o;
}


fn vegTwig( st: vec2f, G: f32, rot: f32 ) -> VegRosette {
	let cuv = st * G;
	let cell = floor( cuv );
	let h1 = vegHash12( cell + rot * 17.3 );
	let h2 = vegHash12( cell * 1.7 + rot * 31.1 + 5.2 );
	let h3 = vegHash12( cell * 2.3 + rot * 7.7 + 1.9 );
	let sc = mix( 0.78, 1.05, h2 );
	let q = ( fract( cuv ) - 0.5 - vec2f( h1 - 0.5, h3 - 0.5 ) * 0.16 ) * 2.0 / sc;
	let angle = h1 * 6.2832 + rot;
	let p = vec2f( q.x * cos( angle ) - q.y * sin( angle ), q.x * sin( angle ) + q.y * cos( angle ) );
	let curve = ( h2 - 0.5 ) * 0.34;
	let axisX = curve * ( 1.0 - p.y * p.y );
	var d = select( -1.0, 0.012 - abs( p.x - axisX ), p.y > -0.82 && p.y < 0.76 );
	var bright = 0.67;
	var leafRand = h1;
	for ( var i = 0; i < 9; i ++ ) {
		let terminal = i == 8;
		let row = f32( i / 2 );
		let side = select( -1.0, 1.0, i % 2 == 0 );
		let lr = vegHash12( cell + vec2f( f32( i ) * 3.7, rot * 13.7 ) );
		let y = select( -0.61 + row * 0.31 + ( lr - 0.5 ) * 0.11, 0.52, terminal );
		let origin = vec2f( curve * ( 1.0 - y * y ), y );
		let dir = normalize( select( vec2f( side * ( 0.76 + lr * 0.2 ), 0.35 + lr * 0.3 ), vec2f( -curve, 1.0 ), terminal ) );
		let delta = p - origin;
		let L = select( mix( 0.46, 0.72, lr ) * ( 1.0 - row * 0.075 ), 0.42, terminal );
		let along = dot( delta, dir );
		let x = along / L;
		let across = abs( dot( delta, vec2f( -dir.y, dir.x ) ) - sin( x * 3.14159 ) * ( lr - 0.5 ) * 0.04 );
		let blade = clamp( ( x - 0.1 ) / 0.9, 0.0, 1.0 );
		let shape = pow( max( sin( blade * 3.14159 ), 0.0 ), 0.78 );
		let edge = shape * L * mix( 0.16, 0.23, fract( lr * 7.3 ) ) * ( 1.0 + sin( blade * 47.0 ) * 0.025 );
		let leafD = select( -1.0, max( edge - across, select( -1.0, 0.008 - across, x < 0.15 ) ), x > 0.0 && x < 1.0 && lr > 0.055 );
		if ( leafD > d ) {
			d = leafD;
			let vein = 1.0 - smoothstep( 0.004, 0.014, across );
			bright = mix( 0.76, 1.12, blade ) * ( 0.9 + lr * 0.2 ) + vein * 0.08;
			leafRand = lr;
		}
	}
	var o: VegRosette;
	o.d = select( d, -1.0, h3 < 0.14 );
	o.bright = bright;
	o.cell = leafRand;
	return o;
}
