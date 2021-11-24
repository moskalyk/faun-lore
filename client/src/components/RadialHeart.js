import React, {useState, useEffect } from 'react'

import './p5-fix.js'

import "p5/lib/addons/p5.sound"
import Oscillator from 'p5/lib/addons/p5.sound'
import * as p5 from "p5"
let aud, osc, audiocontext;

var note = 0;

// type VibrationProps = {
//   online: number,
//   vibrations: [number]
// }

class RadialHeart extends React.Component {
    constructor(props) {
        super(props)
        this.myRef = React.createRef()
    }

    Sketch = (p) => {
        // Initialize global variables and constants
        let bands = 1024
        let amp, fft, canvas, song, dimension
        let times = [0,0,0,0,0,0,0]

        let beatThreshold = 0.16
        let beatCutoff = 0
        let beatDecayRate = 0.9995
        let beatState = 0
        let selectedPalette = 0

        let NUM_PALETTES = 4
        let NUM_DOTS = 560
        let NUM_RINGS = 7
        let RING_GROWTH_RATE = 20

        let colorPalettes = [
            [
                p.color('#F94144'),
                p.color('#F3722C'),
                p.color('#F8961E'),
                p.color('#F9C74F'),
                p.color('#90BE6D'),
                p.color('#43AA8B'),
                p.color('#577590')
            ],
            [
                p.color('#577590'),
                p.color('#43AA8B'),
                p.color('#90BE6D'),
                p.color('#F9C74F'),
                p.color('#F8961E'),
                p.color('#F3722C'),
                p.color('#F94144')
            ],
            [
                p.color('#D7D9B1'),
                p.color('#84ACCE'),
                p.color('#827191'),
                p.color('#7D1D3F'),
                p.color('#512500'),
                p.color('#092327'),
                p.color('#0B5351')
            ],
            [
                p.color('#0B5351'),
                p.color('#092327'),
                p.color('#512500'),
                p.color('#7D1D3F'),
                p.color('#827191'),
                p.color('#84ACCE'),
                p.color('#D7D9B1')
            ]
        ]

        // Loads the music file into p5.js to play on click
        p.preload = () => {
            // p.soundFormats('mp3')
            // song = p.loadSound(benSong)
        }

        // Initial setup to create canvas and audio analyzers
        p.setup = () => {
            // audiocontext = new (window.AudioContext)()
            aud = new p5.AudioIn();
            aud.start()

            dimension = p.min(p.windowWidth / 1.5, p.windowHeight / 1.5)
            p.frameRate(60)
            p.pixelDensity(2.0)

            canvas = p.createCanvas(dimension, dimension)
            canvas.mouseClicked(p.handleClick)

            // myCustomSetup()
            osc = new p5.Oscillator()
            
            amp = new p5.Amplitude(0.1)
            fft = new p5.FFT(0.75, bands)
            fft.setInput(osc);
        }

        p.draw = () => {
            // Use overal song volume to detect "beats"
            let amplitude = amp.getLevel()
            p.checkBeat(amplitude)

            // use the FFT values as the size for each dot
            fft.analyze()
            let sizes = fft.linAverages(NUM_DOTS/2)             // Number of Dots
            for (let i = 0; i < sizes.length; i++) {
                sizes[i] = p.map(sizes[i], 0, 255, 5.0, 23.)    // scales the FFT values to a good size range
            }

            // Calculate the "volume" at each frequency range to control the speed of rotation for each ring
            let beatLevels = []
            beatLevels.push(p.map(fft.getEnergy(16,60), 0, 255, 0, 1.0))
            beatLevels.push(p.map(fft.getEnergy(60,250), 0, 255, 0, 1.0))
            beatLevels.push(p.map(fft.getEnergy(250,500), 0, 255, 0, 1.0))
            beatLevels.push(p.map(fft.getEnergy(500,2000), 0, 255, 0, 1.0))
            beatLevels.push(p.map(fft.getEnergy(2000,4000), 0, 255, 0, 1.0))
            beatLevels.push(p.map(fft.getEnergy(4000,6000), 0, 255, 0, 1.0))
            beatLevels.push(p.map(fft.getEnergy(6000,20000), 0, 255, 0, 1.0))

            for(let i = 0; i < NUM_RINGS; i++){
                times[i] = times[i] + (p.constrain(0.012 * beatLevels[i], 0.0009, 0.012)*(-2*beatState+1))
            }

            p.translate(p.width/2, p.height/2);                 // Center the canvas so that 0,0 is the center

            // Main loop to draw the dots among each frequency ring.
            let curDot = 0
            for(let i = 1; i < NUM_RINGS+1; i++){
                p.fill(colorPalettes[selectedPalette][i-1])    // Update the color for the current ring

                let ringDotCount = i*RING_GROWTH_RATE
                let r = ringDotCount*1.6 * (dimension/640)         // Scale the radius by canvas dimensions

                // Iterate through half of the dots, adding 2 each iteration so that the end result is symmetric
                for(let angleIter = 0; angleIter < ringDotCount/2; angleIter++){
                    let angle1 = times[i-1]*(-2*(i%2)+1) + angleIter*(p.TWO_PI/ringDotCount)
                    let angle2 = times[i-1]*(-2*(i%2)+1) - angleIter*(p.TWO_PI/ringDotCount)
                    sizes[curDot] = sizes[curDot]**(i/NUM_RINGS+.9)  // Scale the sizes exponentially so that the edges are larger   

                    let x = r * p.sin(angle1)
                    let y = r * p.cos(angle1)
                    p.ellipse(x,y, sizes[curDot])

                    x = r * p.sin(angle2)
                    y = r * p.cos(angle2)
                    p.ellipse(x,y, sizes[curDot])

                    // Handle the final dot edge case so that curDot is properly handled and there isn't a missing dot
                    if(angleIter + 1 == ringDotCount/2){
                        let angle = times[i-1]*(-2*(i%2)+1) + (angleIter+1)*(p.TWO_PI/ringDotCount)
                        x = r * p.sin(angle)
                        y = r * p.cos(angle)
                        p.ellipse(x,y, sizes[curDot])
                    }

                    curDot++
                }
            }
        }

        p.windowResized = () => {
            dimension = p.min(p.windowWidth / 1.5, p.windowHeight / 1.5)
            p.resizeCanvas(dimension, dimension)
        }

        // Implements a decaying beat detection
        p.checkBeat = (beatLevel) => {
            if (beatLevel > beatCutoff && beatLevel > beatThreshold) {
                p.onBeat()
                beatCutoff = 1.0
            } else {
                beatCutoff *= beatDecayRate
                beatCutoff = Math.max(beatCutoff, beatThreshold)
            }
        }

        // On beats, clear the screen, update beatState and cycle through the color palettes
        p.onBeat = () => {
            p.clear()                                           // Prevents lag from the "remenant" effect
            beatState = (beatState + 1) % 2
            selectedPalette = (selectedPalette + 1) % NUM_PALETTES
        }

        // Toggles song on click
        p.handleClick = () => {

          // const notes = [10*Math.random(), 14*Math.random(), 40*Math.random(), 23*Math.random()]
          console.log('playing from the heart')
          console.log(this.props.vibrations)

          var playing = 0;
          // var amplifier = aud.createGain();
          var instrument = osc

          var playNotes = function(notes) {
              if(notes){

                  if (note < notes.length && (notes[note] > 0.1)) {
                      console.log('PLAYING NOTE')
                      instrument.freq(174 + (notes[note] * 64 )); // hertz
                      note = note + 1;
                  } else {
                    // instrument.freq(174)
                    note = 0
                      // amplifier.gain.value = 0;
                  }
                  playing = window.setTimeout(playNotes, 40);
              }
          };
          instrument.type = 'sine'; // 'sine', 'square', 'sawtooth', 'triangle'
          instrument.start();

          setInterval((hzNotes) => {
            console.log('VIBRATIONS')
            console.log(hzNotes)
            playNotes([0.027885409581187445, 0.055667573608007, 0.08354387328733845, 0.11138676999319794, 0.13920233699348947, 0.16695413468078904, 0.19473629870760858, 0.22253364590418812, 0.2503977990477116, 0.2780524244485473, 0.3057799290642309, 0.33347403070644255, 0.3613776600913419, 0.3891446409484015, 0.4168812554659411, 0.4447241521718006, 0.4722451656787484, 0.5000607326790399, 0.5277244679817316, 0.5554216062578953, 0.5832675395977067, 0.6109343115343504, 0.63865574288213, 0.6666595811874454, 0.6944478184821689, 0.7223757409386843, 0.7501245019920318, 0.7777700174910116, 0.8055248518122632, 0.8334163346613546, 0.8611924254202702, 0.8888804537945778, 0.9167203138664852, 0.9444053056068409, 0.9721479933922845, 1]);
            // playNotes(hzNotes);
            // console.log('playing notes')
          }, 140, this.props.vibrations)

        }

        // Cycles color palette on Space Bar press
        p.keyPressed  =() => {
            if (p.keyCode === 32) {                             // 32 is the keycode for SPACE_BAR
                selectedPalette = (selectedPalette + 1) % NUM_PALETTES
            }
            return false; // prevent default
        }
    }

    // React things to make p5.js work properly and not lag when leaving the current page below
    componentDidMount() {
        this.myP5 = new p5(this.Sketch, this.myRef.current)
    }

    componentDidUpdate() {
        this.myP5.remove()
        this.myP5 = new p5(this.Sketch, this.myRef.current)
    }

    componentWillUnmount() {
        this.myP5.remove()
    }

    render() {
        return (
                <div style={{textAlign: 'center'}}className="flex flex-wrap lg:flex-nowrap mt-8 w-full justify-center items-center">
                    {/* The actaual canvas for p5.js */}
                    <div
                        style={{display: 'inline'}}
                        className="flex justify-center"
                        ref={this.myRef}
                    />
                </div>
        )
    }
}

export default RadialHeart;
