// Adapted from Tidewater, Copyright (c) 2026 DRG Software Solutions LLC (MIT).
// Full license: docs/tidewater_license.txt.
fn vegPick5( s5: f32, a: vec3f, b: vec3f, c: vec3f, d: vec3f, e: vec3f ) -> vec3f { return select( select( select( select( e, d, s5 < 3.5 ), c, s5 < 2.5 ), b, s5 < 1.5 ), a, s5 < 0.5 ); }
fn vegPick3( s3: f32, a: vec3f, b: vec3f, c: vec3f ) -> vec3f { return select( select( c, b, s3 < 1.5 ), a, s3 < 0.5 ); }
fn vegTreeSpecies( seed: f32 ) -> f32 { return floor( fract( seed * 5.31 ) * 5.0 ); }
// shrubs: 0 sea grape 45 %, 1 croton 15 %, 2 hibiscus 40 %
fn vegShrubSpecies( seed: f32 ) -> f32 {
	let h = fract( seed * 3.17 );
	return select( select( 2.0, 1.0, h < 0.6 ), 0.0, h < 0.45 );
}

// base leaf colour of an instance (species, per-card random cr, per-instance tint)
fn vegCanopyLeafColor( seed: f32, cr: f32, isShrub: bool ) -> vec3f {
	let spT = vegTreeSpecies( seed ); let spS = vegShrubSpecies( seed );
	// tree species: dark glossy (bronze flush), fresh mid green, yellow-green, blue-green
	// (Caribbean hillside forest: deep, olive and yellow-greens, muted, with a few dry / bronze
	// and flowering crowns)
	let t0 = mix( mix( vec3f( 0.02121901, 0.04231141, 0.01096009 ), vec3f( 0.03688945, 0.06847817, 0.01680738 ), cr ), vec3f( 0.11193243, 0.06847817, 0.02732089 ), smoothstep( 0.96, 0.995, cr ) * 0.5 );
	let t1 = mix( vec3f( 0.03433981, 0.06662594, 0.01370208 ), vec3f( 0.06480327, 0.10702310, 0.02028856 ), cr );
	let t2 = mix( vec3f( 0.07818742, 0.10224173, 0.02028856 ), vec3f( 0.12743768, 0.14412847, 0.03071344 ), cr );
	let t3 = mix( vec3f( 0.02315337, 0.04373503, 0.02315337 ), vec3f( 0.04231141, 0.06847817, 0.03688945 ), cr );
	let t4 = mix( vec3f( 0.03560131, 0.08228271, 0.04231141 ), vec3f( 0.08021982, 0.16202938, 0.08437621 ), cr );
	let s0 = mix( vec3f( 0.04970657, 0.09084171, 0.01599629 ), vec3f( 0.08437621, 0.13286832, 0.02315337 ), cr );
	let s1 = mix( vec3f( 0.02518686, 0.05448028, 0.01298303 ), vec3f( 0.05780543, 0.09305896, 0.01370208 ), cr );
	let s2 = mix( vec3f( 0.03433981, 0.08437621, 0.01161225 ), vec3f( 0.06124605, 0.13286832, 0.01764195 ), cr );
	let iv = vegHash12( vec2f( seed * 17.3, 4.1 ) );
	let iv2 = vegHash12( vec2f( seed * 5.9, 8.3 ) );
	var c = select( vegPick5( spT, t0, t1, t2, t3, t4 ), vegPick3( spS, s0, s1, s2 ), isShrub ) * ( iv * 0.36 + 0.74 );
	// a few trees dry / dropping leaves (brown-olive), or flowering (flamboyant, orange-red)
	let treeK = select( 1.0, 0.0, isShrub );
	let dry = step( iv2, 0.035 ) * treeK;
	c = mix( c, mix( vec3f( 0.10702310, 0.08437621, 0.03433981 ), vec3f( 0.15592646, 0.10224173, 0.04231141 ), cr ), dry * 0.5 );
	let flower = step( 0.988, iv2 ) * treeK * step( 0.5, cr );
	c = mix( c, vec3f( 0.25415209, 0.06847817, 0.02518686 ), flower * 0.5 );
	return mix( vec3f( vegLuminance( c ) ), c, 0.85 );
}

fn vegBarkColor( n: f32, n2: f32 ) -> vec3f {
	return mix( mix( vec3f( 0.02955683, 0.02315337, 0.01599629 ), vec3f( 0.10702310, 0.09084171, 0.06662594 ), n * 0.6 + n2 * 0.4 ), vec3f( 0.19806932, 0.19806932, 0.14412847 ), smoothstep( 0.64, 0.8, n2 ) * 0.3 );
}

// Every tree uses fine leaves; shrubs keep their round / narrow species silhouettes.
fn vegLeafTile( seed: f32, isShrub: bool ) -> f32 {
	let spS = vegShrubSpecies( seed );
	return select( 1.0, select( 2.0, 3.0, spS == 1.0 ), isShrub );
}
