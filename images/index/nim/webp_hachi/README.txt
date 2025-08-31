# It depends upon the `nimwebp` project, which itself contains original `C` libwep implementation and compiles it along with `nim` code.. 

It is possible to just `build` libwebp, as a `static Lib` or a `dll`, (Configuration is very simple), but compiling from sources work good and produce a bit faster code and very easy to understand and debug C code if need arises!

We build upon that.. by using a level-lower API to have better control our `buffers` !
Read the code !
