
import React, { FC, ReactElement, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MarkdownDialog.css'

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

import { Close } from '@mui/icons-material/';
import * as registry from '../ChangeRegistry';

type Props = {
    urlprefix: string // eg 
    path: string
}

export const MarkdownDiv: FC<Props> = (props: Props): ReactElement => {

    const [theMarkdown, settheMarkdown] = React.useState("")

    useEffect(() => {
        if (theMarkdown.length === 0) {
            console.log("MarkdownDiv useEffect url", props.urlprefix + props.path)
            fetch(props.urlprefix + props.path)
                .then((response) => response.text())
                .then((data) => {
                    let got = data as string

                    const replacement = '](' + props.urlprefix
                    // replace all the link and image paths with ](/  with replacement
                    got = got.replaceAll('](/', replacement)
                    // console.log("MarkdownDiv using", got)
                    settheMarkdown(got) // causes redraws
                })
        }

        registry.SetSubscripton("MarkdownDivChangeNotification", (name: string, arg: any) => {
            console.log("MarkdownDiv useEffect got change notification")
            // we may consider re-writing the markdown here
            settheMarkdown("") // causes redraw
        })
    })

    const xxxrenderers = {
        //This custom renderer changes how images are rendered
        //we use it to constrain the max width of an image to its container
        image: ({
            alt,
            src,
            title,
        }: {
            alt?: string;
            src?: string;
            title?: string;
        }) => (
            <img
                alt={alt}
                src={src}
                title={title}
                style={{ maxWidth: 475 }} />
        ),
    };

    //   components={{ p: "div" }} // this is a hack to get rid of the <p> tags 

    return (
        <div className='likeTypography'>
            {/* <Typography> */}
                <ReactMarkdown children={theMarkdown}
                    remarkPlugins={[remarkGfm]}
                    linkTarget="_blank"
                />
            {/* </Typography> */}
        </div>
    );
};

export default MarkdownDiv;

// Copyright 2021-2022 Alan Tracey Wootton
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
