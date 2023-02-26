
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
    onConfirm: (str: string) => any
    label: string // the label of the text field
    default: string // default text in the input
}

export const MyInputDialog: FC<Props> = (props: Props): ReactElement => {

    let theTextTyped: string = ''

    function textClicked(e: React.ChangeEvent<HTMLInputElement>) {
        const str = e.currentTarget.value
        // console.log("MyInputDialogtextClicked", str)
        theTextTyped = str
    }

    function confirmMe() {
        props.onConfirm(theTextTyped)
    }
    return (
        <Dialog open={props.open} maxWidth="sm" fullWidth
            onClose={props.onClose}
        >
            <DialogTitle>{props.title}</DialogTitle>
            <Box position="absolute" top={0} right={0}>
                <IconButton onClick={props.onClose}>
                    <Close  />
                </IconButton>
            </Box>
            <DialogContent>
                <Typography>{props.body}</Typography>
                <TextField
                    onChange={textClicked}
                    // id="outlined-helperText"
                    label={props.label}
                    defaultValue={props.default}
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

export default MyInputDialog;

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
