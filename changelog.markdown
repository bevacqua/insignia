# 4.4.0 FocusFest

- Added `convertOnFocus` option

# 4.3.1 DeleteConf

- Fixed an issue where `deletion` wouldn't append the element in charge of removing tags

# 4.3.0 Render Asunder

- Introduced custom `render` method
- Introduced custom `readTag` method

# 4.2.2 Roman Emperor

- Added a custom `insignia-evaluated` event that's fired whenever a tag is evaluated

# 4.2.1 Cross Polinize

- Updated `crossvent` to `1.3.1`

# 4.2.0 Wonderboy

- Introduced `insignia.find` method to look for existing instances

# 4.1.1 Roman Emperor

- Added a custom `insignia-converted` event that's fired whenever a tag is converted

# 4.0.2 Battle Focus

- Fixed a bug where focus would get lost while initializing an element with `insignia(el)`

# 4.0.1 Bug Safari

- Fixed a Safari bug where focusing would break ([#6](https://github.com/bevacqua/insignia/issues/6))

# 4.0.0 Blurry Vision

- Reintroduced tag conversion on `focus` events

# 3.0.3 Cross Ventures

- Replaced `./events` with `crossvent` for code reuse

# 3.0.0 Puppy Eyes

- Blur autoconversion of leftovers is now behind a flag. Set `blurry: true` for the `2.0.0` behavior

# 2.0.0 Slash and Dice

- Removed `dupes` option
- Introduced `parse` option to massage user-input tag into value of your choosing
- Introduced `validate` option to assert whether a value is a valid tag

# 1.4.0 Demeter Law

- Introduced custom `delimiter` support

# 1.3.1 Empty Shoebox

- Fixed a bug where `.tags()` would sometimes return empty elements

# 1.3.0 Conversion King

- Introduced `.convert(everything=false)` API endpoint to parse tags on demand

# 1.2.0 Dupe dupes

- Introduced `dupes` option which allows duplicates when set to `true`

# 1.1.0 Hack and Slash

- After removing a tag by clicking on its _Remove_ button, all tags are now shifted to the left of the input

# 1.0.0 IPO

- Initial Public Release
