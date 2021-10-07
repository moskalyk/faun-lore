import _ from 'lodash';
import { useEffect, useState } from 'react';

// doc control
import { getUpdatedDocFromText, initDoc, SyncClient } from '../app/sync';
import { withErrorHandlingAsync } from './util';
import { addEntry, getHistory, registerTextState } from 'src/_aqua/app';

// user control
import { initAfterJoin, updateOnlineStatuses } from 'src/_aqua/app';
import { registerUserStatus } from 'src/_aqua/app';
import { Fluence, FluencePeer, PeerIdB58 } from '@fluencelabs/fluence';


interface User {
    id: PeerIdB58;
    name: string;
    isOnline: boolean;
}

// const updateOnlineStatus = (user, onlineStatus) => {
//     setUsers((prev) => {
//         const result = new Map(prev);
//         const u = result.get(user);
//         if (u) {
//             result.set(user, { ...u, isOnline: onlineStatus });
//         }
//         return result;
//     });
// };

class Faun {

    public client: SyncClient;
    public peers: [any];

    constructor(syncClient){
        this.client = syncClient;

        // register cid handler
        registerTextState({
            notifyTextUpdate: (changes, isAuthorized) => {
                if (changes) {
                    syncClient.receiveChanges(changes);
                }
            }
        })

        //register online status
        this.feed()

        //register userlist
        this.numbers()

        //TODO: register compute size

    }

    // list feed
    async feed(){
        try{
            const res = await getHistory();
                console.log('RES')
                console.log(res)
            for (let e of res.entries) {
                this.client.receiveChanges(e.body);
            }

            if (this.client.getDoc() === undefined) {
                this.client.syncDoc(initDoc());
            }
        }catch(e){
            console.log('error with feed')
            console.log(e)
        }
    }

    // file size calculator
    examine(cidList){

    }

    // push a particle
    record(cid){
        broadcastUpdates(cid, this.client)
    }

    // # of online peers
    numbers(){
        let self = this;

        registerUserStatus({
            notifyOnline: (user, onlineStatus) => {
                console.log('ONLINE')
                console.log(user)
                console.log(onlineStatus)
            },
            notifyUserAdded: (user, isOnline) => {
                console.log('NEW_USER')
                console.log(user)
                console.log(isOnline)
                self.peers.push(user);


                // setUsers((prev) => {
                //     const u = user;
                //     const result = new Map(prev);
                //     if (result.has(u.peer_id)) {
                //         return result;
                //     }

                //     result.set(u.peer_id, {
                //         name: u.name,
                //         id: u.peer_id,
                //         isOnline: isOnline,
                //     });

                //     return result;
                // });
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
}

const broadcastUpdates = _.debounce((text: string, syncClient: SyncClient) => {
    let doc = syncClient.getDoc();
    if (doc) {
        let newDoc = getUpdatedDocFromText(doc, text);
        syncClient.syncDoc(newDoc);
    }
}, 100);

export const CollaborativeEditor = () => {
    const [clock, setClock] = useState<boolean>(false)
    const [text, setText] = useState<string | null>(null);
    const [syncClient, setSyncClient] = useState(new SyncClient());

    useEffect(() => {
        syncClient.handleDocUpdate = (doc) => {
            setText(doc.text.toString());
        };

        syncClient.handleSendChanges = (changes: string) => {
            withErrorHandlingAsync(async () => {
                const res = await addEntry(changes);
                if (res.ret_code !== 0) {
                    throw new Error(
                        `Failed to add message to history service, code=${res.ret_code}, message=${res.err_msg}`,
                    );
                }
            });
        };

        registerTextState({
            notifyTextUpdate: (changes, isAuthorized) => {
                if (changes) {
                    syncClient.receiveChanges(changes);
                }
            }
        })
        

        syncClient.start();

        // don't block
        withErrorHandlingAsync(async () => {
            const res = await getHistory();
                console.log('RES')
                console.log(res)
            for (let e of res.entries) {
                syncClient.receiveChanges(e.body);
            }

            if (syncClient.getDoc() === undefined) {
                syncClient.syncDoc(initDoc());
            }
        });

        if(!clock){
            setClock(true)
            setInterval(() => {
                console.log('calling window')
                broadcastUpdates(String(Math.random()), syncClient)
            }, 1000)
        }

        return () => {
            syncClient.stop();
        };
    }, []);

    const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);
        broadcastUpdates(newText, syncClient);
    };

    return (
        <textarea
            spellCheck={false}
            className="code-editor"
            disabled={text === null}
            value={text ?? ''}
            onChange={handleTextUpdate}
        />
    );
};
