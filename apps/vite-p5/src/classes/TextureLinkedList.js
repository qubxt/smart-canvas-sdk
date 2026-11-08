class Node {
  constructor(key, img) {
    this.img = img;
    this.key = key;
    this.prev = null;
    this.next = null;
  }
}

export default class LinkedList {
  constructor({ images }) {
    this.head = null;
    this.images = images;
    this.ready = this.createP5LinkedList();
  }
  async createP5LinkedList() {
    const loaders = this.images.map(({ key, path }) => {
      return new Promise((resolve) => {
      loadImage(path, (img) => resolve({ key, img }))
      })
    })
    return Promise.all(loaders).then( (loaded ) => {
      let head = null
      let current = null
      loaded.forEach(({ key, img }) => {
        const node = new Node(key, img)
        if (!head) {
          head = node
          current = node
        } else {
          current.next = node
          node.prev = current
          current = node
        }
      })
      // Close the loop
      current.next = head
      head.prev = current
      this.head = head
    })
  }
}

