
import React, { FC, ReactElement } from 'react'

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

import TextField from '@mui/material/TextField';

type Props = {
    open: boolean
    onClose: () => any
    title: string
    body: string
    onConfirm: (str: string, str2: string) => any

    label: string // the label of the text field
    default: string // default text in the input

    label2: string // the label of the other text field
    default2: string // default text in the input

}

export const MyDualInputDialog: FC<Props> = (props: Props): ReactElement => {

    let theTextTyped: string = props.default
    let theTextTyped2: string = props.default2

    function textChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        // no spaces !!! 
        str = str.replaceAll(' ', '')
        theTextTyped = str
        e.currentTarget.value = str
    }

    function textChanged2(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        str = str.replaceAll(' ', '')
        theTextTyped2 = str
        e.currentTarget.value = str
    }

    function confirmMe() {
        props.onConfirm(theTextTyped, theTextTyped2)
    }
    return (
        <Dialog open={props.open} maxWidth="sm" fullWidth
            onClose={props.onClose}
        >
            <DialogTitle>{props.title}</DialogTitle>
            <Box position="absolute" top={0} right={0}>
                <IconButton onClick={props.onClose}>
                    <Close />
                </IconButton>
            </Box>
            <DialogContent>
            {/* <Typography>{props.body}</Typography> */}
            <div className="likeTypography">{props.body}</div>
            <TextField
                    autoFocus
                    onChange={textChanged}
                    // id="outlined-helperText"
                    label={props.label}
                    defaultValue={props.default}
                    helperText=""
                    fullWidth
                />
                <TextField
                    onChange={textChanged2}
                    // id="outlined-helperText"
                    label={props.label2}
                    defaultValue={props.default2}
                    helperText=""
                    fullWidth
                />

            </DialogContent>

            <DialogActions>
                <Button color="primary" variant="contained" onClick={props.onClose}>
                    Cancel
                </Button>
                <Button color="secondary" variant="contained" onClick={confirmMe}>
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MyDualInputDialog;

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
