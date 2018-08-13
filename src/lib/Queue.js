class Queue {
    constructor() {
        this.items = [];
    }    
    enqueue(item) {
        this.items.unshift(item);        
    }
    dequeue() {
        return this.items.pop();
    }
    head() {
        return this.items[this.items.length - 1];
    }
    tail() {
        return this.items[0];
    }
    isEmpty() {
        if (this.items.length == 0) {
            return true;
        } else {
            return false;
        }
    }
    advanceQueue(item) {
        this.items.push(item);
    }
    size() {
        return this.items.length;
    }
}
module.exports=Queue;