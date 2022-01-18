def setup():
    global LLINE, RLINE, TICKS_PER_MM, TURN, JUMP, active, Side_is_L, MPX_ADDR, AS5600_ADDR



def switch_sides():
    global Side_is_L
    Side_is_L = 1 - Side_is_L
    if Side_is_L == 1:
        basic.show_arrow(ArrowNames.EAST)
    else:
        basic.show_arrow(ArrowNames.WEST)
    basic.pause(500)
def activate():
    global active
    datalogger.delete_log()
    datalogger.set_columns(["Lstep", "Lmm", "Rstep", "Rmm"])
    datalogger.include_timestamp(FlashLogTimeStampFormat.SECONDS)
    start_track()
    active = 1
def start_track():
    global Lmm, Lstep, Lstep_was, Rmm, Rstep, Rstep_was
    Lmm = 0
    Lstep = 0
    Lstep_was = 0
    Rmm = 0
    Rstep = 0
    Rstep_was = 0
def update_track():
    global Lmm, Lstep, Lstep_was, Rmm, Rstep, Rstep_was
    # Left side: apply "flywheel" prediction
    guess = 2 * Lstep - Lstep_was
    Lstep = 0 - Lmm
    # (new reading is always modulo TURN)
    Lmm = read_rotation(LLINE)
    Lstep += Lmm
    # positive if lower than expected
    error = guess - Lstep
    if error > JUMP:
        # Ignore a small shortfall :  Lstep just shows slight slowing.
        # Lstep being too low by more than JUMP, means it's just overflowed
        # (or has rolled round going forwards more than once previously)
        # so add in enough extra full TURNs to leave just a small shortfall
        Lstep += TURN * Math.round(error / TURN)
    # positive if higher than expected
    error = Lstep - guess
    if error > JUMP:
        # Again, ignore a small gain :  Lstep correctly reflects speed change.
        # Lstep being too high by more than JUMP, means it's just underflowed
        # (or has rolled round going backwards more than once previously)
        # so subtract enough full TURNs to leave just a small gain
        Lstep += (0 - TURN) * Math.round(error / TURN)
    Rstep_was = Rstep
    # Now repeat all processing for Right side
    guess = 2 * Rstep - Rstep_was
    Rstep = 0 - Rmm
    Rmm = read_rotation(RLINE)
    Rstep += Rmm
    error = guess - Rstep
    if error > JUMP:
        Rstep += TURN * Math.round(error / TURN)
    error = Rstep - guess
    if error > JUMP:
        Rstep += (0 - TURN) * Math.round(error / TURN)
    Rstep_was = Rstep
    
def set_Lspeed(speed: number):
    if speed > 0:
        Kitronik_Move_Motor.motor_on(Kitronik_Move_Motor.Motors.MOTOR_LEFT,
            Kitronik_Move_Motor.MotorDirection.FORWARD,
            speed)
    else:
        Kitronik_Move_Motor.motor_on(Kitronik_Move_Motor.Motors.MOTOR_LEFT,
            Kitronik_Move_Motor.MotorDirection.REVERSE,
            0 - speed)
def set_Rspeed(speed2: number):
    if speed2 > 0:
        Kitronik_Move_Motor.motor_on(Kitronik_Move_Motor.Motors.MOTOR_RIGHT,
            Kitronik_Move_Motor.MotorDirection.FORWARD,
            speed2)
    else:
        Kitronik_Move_Motor.motor_on(Kitronik_Move_Motor.Motors.MOTOR_RIGHT,
            Kitronik_Move_Motor.MotorDirection.REVERSE,
            0 - speed2)

def read_rotation(line4: number):
    # Address switch on 0x70
    # Write 1 byte to  select "line"
    pins.i2c_write_number(MPX_ADDR, line4, NumberFormat.INT8_LE, False)
    # ??basic.pause(1)
    # Address rotation sensor on 0x36
    # Write 1 byte = 12  to  select RAW register.
    pins.i2c_write_number(AS5600_ADDR, 12, NumberFormat.INT8_LE, False)
    # ??basic.pause(1)
    # Address rotation sensor on 0x36
    # Read 2 bytes of RAW rotation.
    # then convert to mm of travel
    return Uword(pins.i2c_read_number(AS5600_ADDR, NumberFormat.INT16_BE, False)) / TICKS_PER_MM



def fetch_word_reg(word_reg: number, line: number):
    pins.i2c_write_number(MPX_ADDR, line, NumberFormat.INT8_LE, False)
    basic.pause(1)
    pins.i2c_write_number(AS5600_ADDR, word_reg, NumberFormat.INT8_LE, False)
    basic.pause(1)
    return Uword(pins.i2c_read_number(AS5600_ADDR, NumberFormat.INT16_BE, False))
def fetch_byte_reg(byte_reg: number, line2: number):
    pins.i2c_write_number(MPX_ADDR, line2, NumberFormat.INT8_LE, False)
    basic.pause(1)
    pins.i2c_write_number(AS5600_ADDR, byte_reg, NumberFormat.INT8_LE, False)
    basic.pause(1)
    return Ubyte(pins.i2c_read_number(AS5600_ADDR, NumberFormat.INT8_LE, False))
def as5600_read(line3: number):
    global conf_reg, status_reg, agc_reg
    conf_reg = fetch_word_reg(7, line3)
    status_reg = fetch_byte_reg(11, line3)
    agc_reg = fetch_byte_reg(26, line3)

def dial24_init():
    global dial24_list, dial24_is
    dial24_list = [2120,
        2130,
        3130,
        3140,
        3141,
        3241,
        3242,
        3243,
        3343,
        3344,
        3334,
        2334,
        2324,
        2314,
        1314,
        1304,
        1303,
        1203,
        1202,
        1201,
        1101,
        1100,
        1110,
        2110]
    dial24_is = -1
    basic.clear_screen()
    led.plot(2, 2)
def dial24_point(value: number):
    global dial24_is
    if dial24_is > -1:
        dial24_flip(dial24_is)
    dial24_is = dial24_list[(value + 24) % 24]
    dial24_flip(dial24_is)
def dial24_finish():
    global dial24_list, dial24_is
    dial24_list = []
    if dial24_is != -1:
        basic.clear_screen()
        dial24_is = -1
def dial24_flip(xyxy: number):
    dial24_flip_xy(Math.idiv(xyxy, 100))
    dial24_flip_xy(xyxy % 100)
def dial24_flip_xy(xy: number):
    led.toggle(Math.idiv(xy, 10), xy % 10)

def Uword(val: number):
    return (val + 65536) % 65536
def Ubyte(val2: number):
    return (val2 + 256) % 256
def hex_int32(int32: number):
    return "" + hex_word(Math.floor(int32 / 65536)) + hex_word(int32 % 65536)
def hex_word(word: number):
    return "" + hex_byte(Math.floor(word / 256)) + hex_byte(word % 256)
def hex_byte(byte: number):
    return "" + hex_nibble(Math.floor(byte / 16)) + hex_nibble(byte % 16)
def hex_nibble(nibble: number):
    if nibble < 10:
        return String.from_char_code(48 + nibble)
    else:
        return String.from_char_code(55 + nibble)

def time_point24():
    global ms
    dial24_init()
    ms = 0 - input.running_time()
    for index in range(1000):
        dial24_point(0 / 170.667)
    ms += input.running_time()
    dial24_finish()
    basic.show_number(ms)
    basic.pause(5000)
def time_update_track():
    global ms
    ms = 0 - input.running_time()
    for index2 in range(1000):
        update_track()
    ms += input.running_time()
    basic.clear_screen()
    basic.show_number(ms)
    basic.pause(5000)
    basic.clear_screen()
    basic.show_number(ms)

MPX_ADDR = 112
AS5600_ADDR = 54
LLINE = 7
RLINE = 1
TICKS_PER_MM = 71.61
TURN = 4096 / TICKS_PER_MM
JUMP = TURN * 0.3
active = 0
Side_is_L = 0
switch_sides()
agc_reg = 0
status_reg = 0
conf_reg = 0
Lspeed = 0
Rspeed = 0
dial24_is = 0
dial24_list: List[number] = []
Lmm = 0
Lstep = 0
Lstep_was = 0
Rmm = 0
Rstep = 0
Rstep_was = 0
ms = 0

basic.show_icon(IconNames.DIAMOND)
basic.pause(1000)
dial24_init()
for index3 in range(25):
    dial24_point(index3)
    basic.pause(100)
dial24_finish()
basic.pause(1000)

# ??time_update_track()

def on_every_interval():
    if active == 1:
        update_track()
loops.every_interval(20, on_every_interval)

def on_every_interval2():
    if active == 1:
        datalogger.log_data([datalogger.create_cv("Lstep", Math.round(Lstep)),
                datalogger.create_cv("Lmm", Math.round(Lmm)),
                datalogger.create_cv("Rstep", Math.round(Rstep)),
                datalogger.create_cv("Rmm", Math.round(Rmm))])
        basic.show_number(Lstep)
loops.every_interval(200, on_every_interval2)

def on_button_pressed_a():
    global Lspeed, Rspeed, Lstep, Rstep
    if Side_is_L == 1:
        if Lspeed > -100:
            Lspeed += -10
            set_Lspeed(Lspeed)
            dial24_point(Math.round(Lstep))
    elif Rspeed > -100:
        Rspeed += -10
        set_Rspeed(Rspeed)
        dial24_point(Math.round(Rstep))
input.on_button_pressed(Button.A, on_button_pressed_a)
def on_button_pressed_b():
    global Lspeed, Rspeed
    if Side_is_L == 1:
        if Lspeed < 100:
            Lspeed += 10
            set_Lspeed(Lspeed)
            dial24_point(Math.round(Lstep))
    elif Rspeed < 100:
        Rspeed += 10
        set_Rspeed(Rspeed)
        dial24_point(Math.round(Rstep))
input.on_button_pressed(Button.B, on_button_pressed_b)
def on_button_pressed_ab():
    global active
    if active == 0:
        dial24_init()
        activate()
    else:
        active = 0
        dial24_finish()
input.on_button_pressed(Button.AB, on_button_pressed_ab)
def on_logo_pressed():
    switch_sides()
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)

def on_log_full():
    global active
    active = 1 - active
    dial24_finish()
datalogger.on_log_full(on_log_full)


