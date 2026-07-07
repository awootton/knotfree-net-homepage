
import React, { FC, ReactElement, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import PluggableList from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MarkdownDiv.css'

import rehypeRaw from "rehype-raw" // let <img> tags through without quoting them

// material ui
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    IconButton,
    Typography,
} from '@mui/material';

import useFetch from "react-fetch-hook";
// import FetchResult from "react-fetch-hook";

import { Close } from '@mui/icons-material/';
import * as registry from '../ChangeRegistry';
import * as app from '../App'

type Props = {
    urlprefix: string // eg 
    path: string
}

export const MarkdownDiv: FC<Props> = (mdprops: Props): ReactElement => {

    const [prefix, SetPrefix] = React.useState(mdprops.urlprefix)
    const [path, setPath] = React.useState(mdprops.path)

    const [reloadTrigger, setReloadTrigger] = React.useState(0);

    console.log('MarkdownDiv url', prefix + path)

    const fetchResult = useFetch(prefix + path, {
        formatter: response => response.text(),
    })

    console.log('MarkdownDiv fetched', fetchResult, reloadTrigger)

    if (fetchResult.isLoading) {
        return (
            <>
                <p>loading...</p>
            </>
        )
    }
    if (fetchResult.error !== undefined) {
        const str = '' + fetchResult.error
        return (
            <div>
                Had an error: {str}
            </div>)
    }

    const theMarkdown = fetchResult.data ? fetchResult.data as string : 'fetchResult.data is undefined'

    function checkReload(e: React.MouseEvent<HTMLDivElement>) {
        console.log('checkReload')
        if (app.isDev) {
            setReloadTrigger(reloadTrigger + 1)
        }
    }

    return (
        (<div className='likeTypography' onClick={checkReload}>
            <ReactMarkdown children={theMarkdown}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw as any]}
                components={{
                    a: props => {
                        if (props.href?.startsWith('https://') || props.href?.startsWith('http://')) {
                            // a global link
                            return (
                                <a href={props.href} target="_blank" rel="noreferrer" >{props.children}</a>
                            )
                        } else {
                            function localLink(e: React.MouseEvent<HTMLButtonElement>) {
                                console.log('localLink', props.href)
                                setPath(props.href ? props.href : '/errorPath')
                            }
                            return (
                                // looks just like a link.
                                (<button className='linkLikeButton' onClick={localLink}>
                                    {props.children}
                                </button>)
                            );
                        }
                    },
                    img: props => {
                        let src = props.src as string
                        if (src.startsWith('/')) {
                            src = prefix + src // a local href
                        }
                        return (
                            <img src={src} alt={props.alt} style={{ maxWidth: 475 }} />
                        )
                    }
                }}
            />
        </div>)
    );
};

export default MarkdownDiv;

// Copyright 2021-2022-2024 Alan Tracey Wootton
// See LICENSE
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
