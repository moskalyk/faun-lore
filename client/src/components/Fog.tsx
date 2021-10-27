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

interface User {
    id: PeerIdB58;
    name: string;
    isOnline: boolean;
}

class Faun {

    // public client: SyncClient;
    public peers: [any];
    public id: any;
    public pouch: any;

    constructor(){
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
                    const notesNumber = window.split(',').map(el => Number(el))

                    this.pouch[changes.split(':')[0]] = notesNumber
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

    useEffect(() => {
        let faun;
        if(!clock){
            setClock(true)
            let faunTemp = new Faun()
            setFaun(faunTemp)

            // faunTemp.client.handleDocUpdate = (doc) => {
            //     setText(doc.text.toString());
            // };

            setInterval(async () => {
                console.log('RECORDING RANDOM NUM')
                await faunTemp.record(`${props.nickName}:${[Math.random(),Math.random(),Math.random() ]}`)
            }, 5000)

            setInterval(() => {
                console.log(faunTemp.numbers())
                setOnline(faunTemp.numbers())
                console.log('UN_LOAD_POUCH')
                console.log(faunTemp.pouch)
                setPocket(faunTemp.pouch)
            }, 3000)
        }
    }, []);

    return (
        <div className="fed">
            <p>online: {online}</p>
            <p>nick: {props.nickName}</p>
            <RadialHeart online={online} vibrations={pocket}/>
        </div>
    );
};

export default Fog
