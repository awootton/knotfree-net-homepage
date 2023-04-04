
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

import Canvas from './Canvas'


type Props = {
    open: boolean
    onClose : () => any
    title: string
 //   body: string 
    onConfirm: () => any
}

export const StarsDialog: FC<Props> = (props: Props): ReactElement => {

    return (
        <Dialog open={props.open} maxWidth="sm" fullWidth
        onClose={props.onClose}
        >
            {/* <DialogTitle>{props.title}</DialogTitle> */}
            Hello world starz - Alan Wootton was here.
            <Canvas/>
        </Dialog>
    );
};

export default StarsDialog;

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
