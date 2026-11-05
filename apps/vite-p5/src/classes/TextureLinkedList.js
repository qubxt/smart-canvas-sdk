class Node {
  constructor(key, img) {
    this.key = key
    this.img = img
    this.next = null
    this.prev = null
  }
}

class LinkedList {
  constructor({ images }) {
    this.images = images
    this.head = null
    // this.setupImages()
  }

  async linkImages() {
    // Convert each entry into a Promise that resolves to { key, img }
    const loaders = this.images.map(({ key, path, type }) => {
      return new Promise((resolve) => {
        loadImage(path, (img) => resolve({ key, img }))
      })
    })

    return Promise.all(loaders).then((loaded) => {
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

  async setupImages() {
    await this.linkImages().then(() => {
      console.log(this)
    })
  }
}
