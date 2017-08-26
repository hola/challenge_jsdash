const Headline = {};

Headline.Component = class Component {
    constructor() {
        console.log('Hello Component!');
    }
}

Headline.Primary = class Primary extends Headline.Component {
    constructor(){
        super();
    }

    gay ({fragmentLength=2, count =3} = {}) {
        console.log(`Gay! fragmentLength: ${fragmentLength} count: ${count}`);
    }
};

let a = new Headline.Primary();
a.gay({fragmentLength:3});
console.log(a instanceof Headline.Primary);
