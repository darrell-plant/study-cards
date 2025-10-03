const str = "NAME: Example";
let m = str.match(/^(NAME:\s*)(.*)$/);
//            group1^^^^^^^ group2^^^^

console.log(m[0]); // "NAME: Example"
console.log(m[1]); // "NAME: "   (the prefix)
console.log(m[2]); // "Example"  (the actual name)