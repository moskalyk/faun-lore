import _ from 'lodash';
import { useEffect, useState } from 'react';

// doc control
import { getUpdatedDocFromText, initDoc, SyncClient } from '../app/sync';
import { withErrorHandlingAsync } from './util';
import { addEntry, registerTextState } from 'src/_aqua/app';

// user control
import { initAfterJoin, updateOnlineStatuses } from 'src/_aqua/app';
import { registerUserStatus } from 'src/_aqua/app';
import { Fluence, FluencePeer, PeerIdB58 } from '@fluencelabs/fluence';

import RadialHeart from './RadialHeart'

import BlueberryDevice from './peripherals/BlueberryConnect.js'
const EventEmitter = require( 'events' );

interface User {
    id: PeerIdB58;
    name: string;
    isOnline: boolean;
}

class Faun extends EventEmitter {


    // public client: SyncClient;
    public peers: [any];
    public id: any;
    public pouch: any;

    constructor(blueberry){
        super()
        // this.client = syncClient;
        this.id = null;
        this.peers = [{user: 'masterchief', isOnline:false}]
        this.pouch = {}

        // register cid handler
        registerTextState({
            notifyTextUpdate: (changes, isAuthorized) => {
                console.log('CHANGES')
                if (changes) {
                    console.log(changes)
                    const window = changes.split(':')[1]
                    const notes = window.split(',')
                    this.pouch[changes.split(':')[0]] = window.split(',')
                    // playSparkline(notes)
                    console.log(notes)
                    // this.client.receiveChanges(changes);
                }
            }
        })

        // this.client.start()

        //register on changes
        this.feed()

        //register userlist
        this.surroundings()

        //TODO: register compute size

    }

    // list feed
    async feed(){
        try{
            // const res = await getHistory();
            //     console.log('RES')
            //     console.log(res)
            // for (let e of res.entries) {
            //     this.client.receiveChanges(e.body);
            // }

            // if (this.client.getDoc() === undefined) {
            //     this.client.syncDoc(initDoc());
            // }
        }catch(e){
            console.log('error with feed')
            console.log(e)
        }
    }

    // file size calculator
    examine(cidList){

    }

    // push a particle
    async record(cid){
        // setInterval(async () => {
            console.log('calling window')
            try{
                const res = await addEntry(cid);
                console.log('ADD_ENTRY')
                console.log(res)
                console.log(cid)

            }catch(e){
                console.log('error sending change')
                console.log(e)
            }

            // broadcastUpdates(String(Math.random()), this.client)
        // }, 5000)
    }

    // # of online peers
    surroundings(){
        let self = this;

        registerUserStatus({
            notifyOnline: (user, onlineStatus) => {
                console.log('ONLINE')
                console.log(user)
                console.log(onlineStatus)
                self.id = user
            },
            notifyUserAdded: (user, isOnline) => {
                console.log('NEW_USER')
                console.log(user)
                console.log(isOnline)
                self.peers.push({user: user, isOnline: isOnline});
            },

            notifyUserRemoved: (userLeft) => {
                // todo
                console.log('USER_LEFT')
                console.log(userLeft)
                // setUsers((prev) => {
                //     const result = new Map(prev);
                //     result.delete(userLeft);
                //     return result;
                // });
            }
        })
    }

    numbers(){
        let count = 0
        let userSet = {}

        this.peers.concat(...this.peers) /* flatten the array */
        .map(peer => {
            if(!(peer.user.name in userSet) && peer.isOnline){
                userSet[peer.user.name] = peer
                count++
                return peer
            } else {
                return
            }
            // peer.isOnline
        }) /* return only enabled: true */

        console.log('LENGTH')
        console.log(count)
        return count
    }
}

const Fog = (props: { nickName: string }) => {
    const [clock, setClock] = useState<boolean>(false)
    const [online, setOnline] = useState<number>(0)
    const [text, setText] = useState<string | null>(null);
    const [faun, setFaun] = useState<any>(null);
    const [pocket, setPocket] = useState<any>(null)
    // const [syncClient, setSyncClient] = useState(new SyncClient());

    // const connectBlueberry = async () => {
    //     console.log('connecting')
    //     // new fox connected
    //     // const newFox = new Fox(ethersProvider.getSigner())

    //     // fox connects to the cosmic fog
    //     // const fog = new Fog(fox)

    //     // faun consums a blueberry
    //     const faun = new Faun(blueberry)

    //     // faun emits lore from surrounding peers
    //     faun.on('lore', async (e) => {
    //       console.log('LOR_EVENT')
    //       console.log(e)

    //       // fox snatches blueberry CID signatures
    //       const cid = await fox.snatch(e)
    //       console.log(cid)
    //     })



    //     // TODO: maybe move into faun 
    //     blueberryDevice.start_connection();

    //     setBlueberry(blueberryDevice)
    //     setFox(newFox)
    //     setFogForest(fog)
    //     setFaun(faun)
    //     setIsOnline(true) // extremely ON
    //     setClockType('radial-aura')
    //   }

    // TODO: set online with fluence and blueberry
    const connect_cb = () => {
        console.log('CONNECTED')
        // setIsOnline(true)
    }

    const disconnect_cb = () => {
        console.log('DISCONNECTED')
    }

    const try_connect_cb = () => {
        console.log('Connecting...')
    }

    useEffect(() => {
        let faun;
        if(!clock){
            setClock(true)
            const blueberry = new BlueberryDevice(connect_cb.bind(this), disconnect_cb.bind(this), try_connect_cb.bind(this))

            blueberry.start_connection();

            let faunTemp = new Faun(blueberry)
            setFaun(faunTemp)

            // const faun = new Faun(blueberry)




            // faunTemp.client.handleDocUpdate = (doc) => {
            //     setText(doc.text.toString());
            // };

            setInterval(async () => {
                console.log('RECORDING RANDOM NUM')
                // poke
                let lightWindow = blueberry.getData('880nm_850nm_27mm');
                console.log(lightWindow)

                // await faunTemp.record(`${props.nickName}:${[Math.random(),Math.random(),Math.random() ]}`)
            }, 5000)

            setInterval(() => {
                // scry
                console.log(faunTemp.numbers())
                setOnline(faunTemp.numbers())
                console.log('UN_LOAD_POUCH')
                console.log(faunTemp.pouch)
                setPocket(faunTemp.pouch)
            }, 3000)
        }
    }, []);

    return (
        <div>
            <p>online: {online}</p>
            <RadialHeart onClick={connectBlueberry} online={online} vibrations={pocket}/>
        </div>
    );
};

export default Fog
