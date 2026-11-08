import p5 from 'p5'
import LinkedList from '../classes/TextureLinkedList.js'

export const images = [
  {
    type: 'image',
    key: 'laiscet_1',
    path: 'laiscet_1.jpg',
  },
  // {
  //   type: 'image',
  //   key: 'laiscet_2',
  //   path: 'images/laiscet/laiscet_2.png',
  // },
  // {
  //   type: 'image',
  //   key: 'laiscet_3',
  //   path: 'images/laiscet_3.png',
  // },
]


window.p5 = p5
export default new p5()
export let nodes = new LinkedList({ images })
