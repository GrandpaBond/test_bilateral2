function check() {
    
    basic.showString("L=" + ("" + ("" + LLINE)) + (",  R=" + ("" + ("" + RLINE))))
    as5600_read(LLINE)
    basic.showString("Lmm=" + ("" + ("" + read_rotation(LLINE))) + (",S=" + ("" + ("" + status_val))) + (",A=" + ("" + ("" + agc_val))))
    as5600_read(RLINE)
    basic.showString("Rmm=" + ("" + ("" + read_rotation(RLINE))) + (",S=" + ("" + ("" + status_val))) + (",A=" + ("" + ("" + agc_val))))
}

function start_track() {
    
    Lmm = 0
    Lstep = 0
    Lstep_was = 0
    Rmm = 0
    Rstep = 0
    Rstep_was = 0
}

function Uword(val: number): number {
    return (val + 65536) % 65536
}

function set_Lspeed(speed: number) {
    if (speed > 0) {
        Kitronik_Move_Motor.motorOn(Kitronik_Move_Motor.Motors.MotorLeft, Kitronik_Move_Motor.MotorDirection.Forward, speed)
    } else {
        Kitronik_Move_Motor.motorOn(Kitronik_Move_Motor.Motors.MotorLeft, Kitronik_Move_Motor.MotorDirection.Reverse, 0 - speed)
    }
    
}

function switch_sides() {
    
    Side_is_L = 1 - Side_is_L
    if (Side_is_L == 1) {
        basic.showArrow(ArrowNames.East)
    } else {
        basic.showArrow(ArrowNames.West)
    }
    
    basic.pause(500)
}

function time_point24() {
    dial24_init()
    let ms = 0 - input.runningTime()
    for (let index = 0; index < 1000; index++) {
        dial24_point(index)
    }
    ms += input.runningTime()
    dial24_finish()
    basic.showNumber(ms)
    basic.pause(5000)
}

function dial24_finish() {
    
    dial24_list = []
    if (dial24_is != -1) {
        basic.clearScreen()
        dial24_is = -1
    }
    
}

datalogger.onLogFull(function on_log_full() {
    
    active = 1 - active
    dial24_finish()
})
function dial24_flip(xyxy: number) {
    dial24_flip_xy(Math.idiv(xyxy, 100))
    dial24_flip_xy(xyxy % 100)
}

input.onButtonPressed(Button.A, function on_button_pressed_a() {
    
    if (Side_is_L == 1) {
        if (Lspeed > -100) {
            Lspeed += -10
            set_Lspeed(Lspeed)
            dial24_point(Math.round(Lstep))
        }
        
    } else if (Rspeed > -100) {
        Rspeed += -10
        set_Rspeed(Rspeed)
        dial24_point(Math.round(Rstep))
    }
    
})
function dial24_point(value: number) {
    
    if (dial24_is > -1) {
        dial24_flip(dial24_is)
    }
    
    dial24_is = dial24_list[(value + 24) % 24]
    dial24_flip(dial24_is)
}

function fetch_word_reg(word_reg: number, line: number): number {
    
    pins.i2cWriteNumber(MPX_ADDR, line, NumberFormat.Int8LE, false)
    basic.pause(1)
    pins.i2cWriteNumber(AS5600_ADDR, word_reg, NumberFormat.Int8LE, false)
    basic.pause(1)
    return Uword(pins.i2cReadNumber(AS5600_ADDR, NumberFormat.Int16BE, false))
}

function time_update_track() {
    let ms2 = 0 - input.runningTime()
    for (let index2 = 0; index2 < 1000; index2++) {
        update_track()
    }
    ms2 += input.runningTime()
    basic.clearScreen()
    basic.showNumber(ms2)
    basic.pause(5000)
    basic.clearScreen()
    basic.showNumber(ms2)
}

function activate() {
    
    datalogger.deleteLog()
    datalogger.setColumns(["Lstep", "Lmm", "Rstep", "Rmm"])
    datalogger.includeTimestamp(FlashLogTimeStampFormat.Seconds)
    start_track()
    active = 1
}

function fetch_byte_reg(byte_reg: number, line2: number): number {
    
    pins.i2cWriteNumber(MPX_ADDR, line2, NumberFormat.Int8LE, false)
    basic.pause(1)
    pins.i2cWriteNumber(AS5600_ADDR, byte_reg, NumberFormat.Int8LE, false)
    basic.pause(1)
    return Ubyte(pins.i2cReadNumber(AS5600_ADDR, NumberFormat.Int8LE, false))
}

function update_track() {
    
    //  Left side: apply "flywheel" prediction
    let guess = 2 * Lstep - Lstep_was
    Lstep = 0 - Lmm
    //  (new reading is always modulo TURN)
    Lmm = read_rotation(LLINE)
    Lstep += Lmm
    //  positive if lower than expected
    let error = guess - Lstep
    if (error > JUMP) {
        //  Ignore a small shortfall :  Lstep just shows slight slowing.
        //  Lstep being too low by more than JUMP, means it's just overflowed
        //  (or has rolled round going forwards more than once previously)
        //  so add in enough extra full TURNs to leave just a small shortfall
        Lstep += TURN * Math.round(error / TURN)
    }
    
    //  positive if higher than expected
    error = Lstep - guess
    if (error > JUMP) {
        //  Again, ignore a small gain :  Lstep correctly reflects speed change.
        //  Lstep being too high by more than JUMP, means it's just underflowed
        //  (or has rolled round going backwards more than once previously)
        //  so subtract enough full TURNs to leave just a small gain
        Lstep += (0 - TURN) * Math.round(error / TURN)
    }
    
    Rstep_was = Rstep
    //  Now repeat all processing for Right side
    guess = 2 * Rstep - Rstep_was
    Rstep = 0 - Rmm
    Rmm = read_rotation(RLINE)
    Rstep += Rmm
    error = guess - Rstep
    if (error > JUMP) {
        Rstep += TURN * Math.round(error / TURN)
    }
    
    error = Rstep - guess
    if (error > JUMP) {
        Rstep += (0 - TURN) * Math.round(error / TURN)
    }
    
    Rstep_was = Rstep
}

function set_Rspeed(speed2: number) {
    if (speed2 > 0) {
        Kitronik_Move_Motor.motorOn(Kitronik_Move_Motor.Motors.MotorRight, Kitronik_Move_Motor.MotorDirection.Forward, speed2)
    } else {
        Kitronik_Move_Motor.motorOn(Kitronik_Move_Motor.Motors.MotorRight, Kitronik_Move_Motor.MotorDirection.Reverse, 0 - speed2)
    }
    
}

function hex_int32(int32: number) {
    return "" + hex_word(Math.floor(int32 / 65536)) + hex_word(int32 % 65536)
}

function dial24_init() {
    
    dial24_list = [2120, 2130, 3130, 3140, 3141, 3241, 3242, 3243, 3343, 3344, 3334, 2334, 2324, 2314, 1314, 1304, 1303, 1203, 1202, 1201, 1101, 1100, 1110, 2110]
    dial24_is = -1
    basic.clearScreen()
    led.plot(2, 2)
}

function hex_word(word: number) {
    return "" + hex_byte(Math.floor(word / 256)) + hex_byte(word % 256)
}

input.onButtonPressed(Button.AB, function on_button_pressed_ab() {
    
    if (active == 0) {
        dial24_init()
        activate()
    } else {
        active = 0
        dial24_finish()
    }
    
})
input.onButtonPressed(Button.B, function on_button_pressed_b() {
    
    if (Side_is_L == 1) {
        if (Lspeed < 100) {
            Lspeed += 10
            set_Lspeed(Lspeed)
            dial24_point(Math.round(Lstep))
        }
        
    } else if (Rspeed < 100) {
        Rspeed += 10
        set_Rspeed(Rspeed)
        dial24_point(Math.round(Rstep))
    }
    
})
function as5600_read(line3: number) {
    
    config_val = fetch_word_reg(CONFIG_REG, line3)
    status_val = fetch_byte_reg(STATUS_REG, line3)
    agc_val = fetch_byte_reg(AGC_REG, line3)
}

function hex_nibble(nibble: number): string {
    if (nibble < 10) {
        return String.fromCharCode(48 + nibble)
    } else {
        return String.fromCharCode(55 + nibble)
    }
    
}

function Ubyte(val2: number): number {
    return (val2 + 256) % 256
}

function read_rotation(line4: number): number {
    
    //  Write 1 byte to select which "line"
    pins.i2cWriteNumber(MPX_ADDR, line4, NumberFormat.Int8LE, false)
    basic.pause(1)
    //  Addressing rotation sensor on 0x36
    //  Write 1 byte = 12  to  select RAW register.
    pins.i2cWriteNumber(AS5600_ADDR, RAW_REG, NumberFormat.Int8LE, false)
    basic.pause(1)
    //  Read 2 bytes of RAW rotation, then convert to mm of travel
    return pins.i2cReadNumber(AS5600_ADDR, NumberFormat.Int16BE, false)
}

input.onLogoEvent(TouchButtonEvent.Pressed, function on_logo_pressed() {
    switch_sides()
})
function dial24_flip_xy(xy: number) {
    led.toggle(Math.idiv(xy, 10), xy % 10)
}

function hex_byte(byte: number) {
    return "" + hex_nibble(Math.floor(byte / 16)) + hex_nibble(byte % 16)
}

function set_defs() {
    
    //  Address multiplexor on 0x70
    MPX_ADDR = 112
    //  Address rotation sensor on 0x36
    AS5600_ADDR = 54
    //  Configuration register starts at 7
    CONFIG_REG = 7
    //  Automatic_Gain_Control register starts at 26
    AGC_REG = 26
    //  Status register starts at 7
    STATUS_REG = 11
    //  Raw_Rotation register starts at 7
    RAW_REG = 12
    LLINE = 7
    RLINE = 1
    TICKS_PER_MM = 71.61
    TURN = 4096 / TICKS_PER_MM
    JUMP = TURN * 0.3
}

//  --- GLOBALS ---
let TICKS_PER_MM = 0
let RAW_REG = 0
let AGC_REG = 0
let STATUS_REG = 0
let CONFIG_REG = 0
let TURN = 0
let JUMP = 0
let LLINE = 0
let RLINE = 0
let AS5600_ADDR = 0
let MPX_ADDR = 0
let Lspeed = 0
let Rspeed = 0
let active = 0
let dial24_is = 0
let dial24_list : number[] = []
let Side_is_L = 0
let Rstep_was = 0
let Rstep = 0
let Rmm = 0
let Lstep_was = 0
let Lstep = 0
let Lmm = 0
let agc_val = 0
let status_val = 0
let config_val = 0
//  --- MAIN CODE ---
set_defs()
basic.showIcon(IconNames.Yes)
basic.pause(1000)
dial24_init()
for (let index3 = 0; index3 < 25; index3++) {
    dial24_point(index3)
    basic.pause(100)
}
dial24_finish()
basic.pause(1000)
switch_sides()
start_track()
check()
loops.everyInterval(40, function on_every_interval() {
    if (active == 1) {
        update_track()
    }
    
})
loops.everyInterval(200, function on_every_interval2() {
    if (active == 1) {
        datalogger.logData([datalogger.createCV("Lstep", Math.round(Lstep)), datalogger.createCV("Lmm", Math.round(Lmm)), datalogger.createCV("Rstep", Math.round(Rstep)), datalogger.createCV("Rmm", Math.round(Rmm))])
        basic.showNumber(Lstep)
    }
    
})
