# Tidewater vegetation export

Run from this repository:

```sh
node scripts/tidewater_vegetation/build.mjs ../tidewater
```

The source argument is optional and defaults to the neighbouring `tidewater`
checkout. The exporter directly invokes its original procedural geometry builders
and applies its crown variant tables. It writes only the current assets to
`web/public/art/vegetation/vegetation.json` and `vegetation.bin`; the running game
does not depend on that checkout. The source MIT license is copied beside them.

The binary uses the existing world library convention: offsets are bytes,
`vertexCount` is a count of Float32 values (divide by 16 for vertex count), and
`indexCount` is a count of Uint32 indices. Each mesh stores vertices immediately
followed by indices. The manifest describes the fixed 16-float attribute layout.
Normals, UVs, material parameters, deformation parameters, and triangle indices
are preserved. Crown lobe scales and tree shape variants are baked for trees and
shrubs. Palms and understory bake the source static upright pose, joining their
stem and crown coordinates at the recorded stem height. No mesh simplification
is performed.

The grass entry extracts every kind-0 blade from the original near patch, with
the source eight-blade clumps and their original segments. It represents one
8 × 8 metre cell; blade tips may overhang its edges. Slot placement, the 1.35
horizontal spread and 1.5 blade width are baked into positions. Metadata X/Y
retains each clump's root X/Z so terrain height can be sampled per plant. The
manifest records the grass attribute interpretation separately from the plants.

The manifest records source hashes and generator seeds so the packed geometry can
be verified against the current Tidewater implementation. Re-running the command
overwrites the same files without retaining old variants or generation caches.
