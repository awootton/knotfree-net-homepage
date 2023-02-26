import React, { useRef, useEffect } from 'react'
import './Canvas.css'

export type Props = {

}

const Canvas = (props: Props) => {

  // const canvasRef = useRef(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  type star = {
    x: number
    y: number
    z: number
  }

  const emptyStar: star = {
    x: 0,
    y: 0,
    z: 0
  }

  var stars = new Array<star>();

  const draw = (ctx: CanvasRenderingContext2D, frameCount: number) => {

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    //ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.fillStyle = 'white'
    // ctx.beginPath()
    // ctx.arc(50, 100, 20 * Math.sin(frameCount * 0.05) ** 2, 0, 2 * Math.PI)
    // ctx.fill()

    const midx = ctx.canvas.width /2
    const midy = ctx.canvas.height /2

    for (let i = 0; i < 1000; i++) {
      if (stars.length <= i) {
        let star = {
          ...emptyStar
        }
        stars.push(star);
      }
      let star = stars.at(i) || emptyStar
      let xt = star.x / star.z + midx
      let yt = star.y / star.z + midy
      let size = 0.2 + 1 / 400 / star.z

      if (size >= 2.0) {
        ctx.beginPath();
        ctx.arc(xt + size / 2, yt + size / 2, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'white';
        ctx.fill();
      } else {
        ctx.fillRect(xt, yt, size, size);
      }

      star.z = star.z - 1 / 50000

      if (xt < 0 || xt >= 1024 || yt < 0 || yt >= 1024 || star.z <= 0) {
        star.x = 2 * Math.random() - 1
        star.y = 2 * Math.random() - 1
        star.z = Math.random() / 100
      }
    }
  }

  useEffect(() => {

    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }
    const context: CanvasRenderingContext2D | null = canvas.getContext('2d')
    let frameCount = 0
    let animationFrameId = 0

    //Our draw came here
    const render = () => {
      frameCount++
      if (context !== null) {
        draw(context, frameCount)
      }
      animationFrameId = window.requestAnimationFrame(render)
    }
    render()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [draw])

  return (
    <div className='canvas'>
      <canvas width="768" height="768" ref={canvasRef} {...props} />
    </div>
  )
}

export default Canvas