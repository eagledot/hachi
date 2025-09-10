# It depends upon the `nimwebp` project, which itself contains original `C` libwep implementation and compiles it along with `nim` code.. 

# Changes need to know:
# 1. Fow now Nimwebp project encoder.nim is being used, to wrap our routines, a field `memory_argb` is exported, so when building on a new system, we have to manually export it.
# 2. Since nimwebp/or we compile the `webp` project C code, cross-compiling get some error, possibly due to not supplying the correct OS,  as we do with Nim `--os:linux` and stuff, have to look into it !
# 3. May will bundle later the `encoder.nim` from nimwebp project, to do away with first issue, but nim codebases are quite stable, upstream code should be default where possible!
# 4. TODO: Compiling with clang, linked against libC 2.27, using zigcc, so as to ship it easily, for most of Linux distributions!   

It is possible to just `build` libwebp, as a `static Lib` or a `dll`, (Configuration is very simple), but compiling from sources work good and produce a bit faster code and very easy to understand and debug C code if need arises!

We build upon that.. by using a level-lower API to have better control our `buffers` !
Read the code !
