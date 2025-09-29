# KPT 1.1 规范

## 1) 设计目标

* **统一描述**各种物联协议（ASCII/二进制/TLV/JSON/CBOR/Protobuf/BER-TLV/CAN）。
* **极简行文本 + 块结构**，解析器实现简洁；节点名即语义。
* **可扩展**：`codec / transform / catalog / overlay / export / envelope / reassembly / checksum.locator` 等扩展点。
* **可测试**：每个 `.kpt` 可内含样例帧与断言。

## 2) 词法 & 语法（精简 BNF）

```
file        := { block }
block       := ident string? "{" { stmt } "}"
stmt        := ident { atom } | block
ident       := [A-Za-z_][A-Za-z0-9_-]*
atom        := number | hex | string | ident
string      := "..." | '...'
number      := [0-9]+
hex         := "0x" [0-9A-Fa-f]+
comment     := "#" .* (EOL)
```

* **缩进不敏感**；一行一个 `stmt`；块第一词是**节点名**，可跟**名字字符串**。
* 字符串支持引号；十六进制常量用 `0x` 前缀；注释以 `#` 起始。

## 3) 根节点

```
protocol "id" {
  title "..."
  version "1.1"
  description "..."
  # 可出现以下子块：frame, checksum, envelope, codec, enum, catalog, units,
  # overlay, reassembly, message, export, tests
}
```

## 4) 帧同步（frame）

```
frame {
  mode fixed|delimited|length|stxetx|slip|cobs|hdlc
  header <hex|string>        # 可省略（如纯 delimited）
  tail   <hex|string>        # delimited/stxetx 需要
  # length 模式：
  length at +<offset>|after_header_bytes <N> size 1|2|4 endian big|little
  length includes header|payload|trailer  # 可多值
  escape on|off  # (slip/hdlc/cobs)
}
```

运行时会暴露辅助上下文：`_frame_start/_payload_start/_payload_end/_payload_len/_before_checksum`。

## 5) 校验（checksum）

```
checksum {
  type none|sum8|xor8|lrc|modbus|crc16|crc32|hmac_sha256|custom "name"
  # 存储位置与编码
  store size 1|2|4|32 endian big|little encoding bin|hex_ascii|dec_ascii|bcd
  # 参与计算的范围
  range from frame_start|after_header|payload_start to before_checksum|payload_end
  # 定位（如 NMEA 的 *CS）
  locator after_char "*" take 2            # 可选
  # 分块 CRC（如 DNP3）
  block size <N> gap <M>                   # 可选
  # CRC/HMAC 参数
  params poly 0x1021 init 0xFFFF refin off refout off xorout 0x0000 key_ref "k_device"
}
```

## 6) 传输封装（envelope）——把承载层上下文暴露给消息层

```
envelope mqtt {
  topic_match "plant/{site}/mn/{mn}/up/{type}"
  expose site mn type
}
envelope can {
  id_bits 11|29
  expose id pgn sa da prio
}
envelope ble { event notify expose handle uuid }
```

> 解析后 `$.site / $.pgn` 等可用于 `select/compute/overlay/export`。

## 7) 编解码插件（codec）

```
codec "kv"   type kv       pair ";" kvsep "=" trim
codec "json" type json
codec "cbor" type cbor
codec "pb"   type protobuf schema "meter.proto" message "Reading"
codec "asn"  type asn1     schema "emv.asn1" root "EMVData"
codec "tlv"  type tlv_ber
codec "dbc"  type can_dbc  file "n2k.dbc"
```

## 8) 枚举（enum）

```
enum "cmd" { 0x01 "ReadStatus"  0x02 "Control" }
```

## 9) 码表/外部知识库（catalog）

```
catalog "points" csv "points.csv" key "code"  # CSV 列可含 name, unit, lat, lon, scale...
catalog "haz" inline { 1001 "H2S" unit "mg/m3"  1002 "CO" unit "mg/m3" }
```

查表：`lookup("points", $.code).name`

## 10) 单位（units）

```
units {
  define "mg/m3" to "µg/m3" factor 1000
  define "Pa"    to "kPa"   factor 0.001
}
```

## 11) 位置/标签叠加（overlay）

```
overlay context {
  site from envelope.mqtt.site
  device_id from message.device_id
  latitude from catalog.points[$.code].lat
  longitude from catalog.points[$.code].lon
  tags ["factory:A","line:3"]
}
```

## 12) 消息定义（message / case / field / compute / assert / group）

```
message "name" {
  select by field "cmd" | select pattern "*|GPRMC*|..."
  # 先声明公共字段（供 select by field 使用）
  field addr u8
  field cmd  enum cmd base u8

  case 0x01 {
    field flags bitset size 1 bits fault:1 online:1 spare:6
    field temp i16 scale 0.1 unit "°C"
  }

  case 0x02 {
    field ch u8
    field val u16
  }

  # 或者批量组：
  group repeat until payload_end {
    field ts   bcd digits 12
    field code u16
    field val  i16 scale 0.1 unit "°C"
    emit "records[]"
  }

  compute pt_name = lookup("points", $.code).name
  assert $.temp >= -400 && $.temp <= 1250
}
```

### 字段类型与修饰

* 标量：`u8/u16/u24/u32/u64/i8/i16/i32/i64/f32/f64/bool`（可加 `endian`）
* 文本/字节：`ascii size N | ascii lenfrom "field" | ascii term "\r\n"`；`bytes size/lenfrom`
* BCD：`bcd digits N`（可配 `scale`）
* 位集：`bitset size N bits a:1 b:1 ...`（跨字节自动处理）
* 枚举：`enum <EnumName> base u8|u16...`
* 数组：`array count N of <type>` 或 `array countfrom "field" of <type>`
* 条件：字段末尾 `when "<expr>"`
* 二次解析：`field obj codec "json" src $payload`
* 变换管线：`transform reverse_bytes bcd_to_int nibble_swap zlib_uncompress ascii_strip parity_drop ...`
* 单位换算：字段上 `unit "mg/m3" convert_to "µg/m3"`
* 计算字段：`compute name = <expr>`（不消耗字节）
* 断言：`assert <expr>`（解析后校验）

### 表达式

* 访问：`$.field`、`len(x)`、`int(x)`、`hex(x)`、`kv(obj).Key`
* 运算：`+ - * / % & | ^ << >>`、比较/逻辑、`in`
* 校验函数：`crc16(buf, params)`、`sum8(buf)`；查表 `lookup(cat, key).col`

## 13) 重组/分片（reassembly）

```
reassembly {
  key $.device_id,$.seq
  total_from $.frag_total
  index_from $.frag_index
  timeout_ms 5000 drop_on_gap true
}
```

## 14) 导出（export）

```
export influx {
  measurement "env_reading"
  tags   ["site","device_id","code","pt_name"]
  fields ["val","unit","quality"]
  timestamp from "parsed_time"
}
export json {
  rename $.val -> $.value
  move   $.pt_name -> $.labels.name
}
```

## 15) 测试（tests）

```
tests {
  sample "case1" {
    raw "##0048STUFF...."        # 可支持 base16/ASCII 直写
    expect "$.message.name" "hj212"
    expect "$.fields.CN"   "2011"
    expect "$.frame.checksum_ok" true
  }
}
```

---

# 多协议 `.kpt` 示例

## A) HJ212（ASCII KV + 长度 + CRC16）

```txt
protocol "hj212-2017" {
  title "HJ212 ASCII"
  version "1.1"

  frame {
    mode length
    header "##"
    length at +0 size 4 encoding dec_ascii includes payload
  }

  checksum {
    type crc16
    store size 4 encoding hex_ascii
    range from after_header to before_checksum
    params poly 0x1021 init 0xFFFF refin off refout off xorout 0x0000
  }

  codec "kv" type kv pair ";" kvsep "=" trim

  message "hj212" {
    select pattern "*"
    field text ascii lenfrom "_frame_payload_len"
    field kv_all codec "kv" src $text
    compute MN = kv(kv_all).MN
    compute CN = kv(kv_all).CN
    compute CP = kv(kv_all).CP
    compute DataTime = kv(CP).DataTime
    assert $.MN != ""
  }
}
```

## B) RS232/485（JBF293K 范式：AA55 + 长度 + CMD + CRC16 Modbus）

```txt
protocol "jbf293k-like" {
  title "Binary RS485"
  version "1.1"

  frame { mode length header 0xAA55 length at +0 size 2 endian little includes payload trailer }
  checksum { type modbus store size 2 endian little encoding bin range from after_header to before_checksum }

  enum "cmd" { 0x01 "ReadStatus" 0x02 "Control" }

  message "bin" {
    select by field "cmd"
    field addr u8
    field cmd  enum cmd base u8

    case 0x01 {
      field flags bitset size 1 bits fault:1 online:1 spare:6
      field temp i16 scale 0.1 unit "°C"
      field hum  u16 scale 0.1 unit "%" 
    }

    case 0x02 {
      field ch u8
      field val u16
    }
  }
}
```

## C) MQTT 主题 + JSON 负载 + 码表/单位/标签叠加

```txt
protocol "iot-json" {
  title "MQTT + JSON"
  version "1.1"

  envelope mqtt { topic_match "plant/{site}/mn/{mn}/up/{type}" expose site mn type }
  codec "json" type json

  catalog "points" csv "points.csv" key "code"
  units { define "mg/m3" to "µg/m3" factor 1000 }

  message "any" {
    select pattern "*"
    field payload bytes lenfrom "_frame_payload_len"
    field obj codec "json" src $payload
    field code u16 when "$.obj.code != null"
    compute name = lookup("points", $.code).name
    compute val  = float($.obj.value)
    compute unit = $.obj.unit
    # 自动单位转换
    field conc u16 scale 0.1 unit "mg/m3" convert_to "µg/m3" when "$.obj.concRaw != null"
    overlay context { site from envelope.mqtt.site mn from envelope.mqtt.mn tags ["iot","uplink"] }
  }
}
```

## D) NMEA0183（$GPRMC … *CS\r\n，XOR 校验 with locator）

```txt
protocol "nmea0183" {
  title "NMEA 0183"
  version "1.1"

  frame { mode delimited header "$" tail "\r\n" }
  checksum {
    type xor8
    store encoding hex_ascii locator after_char "*" take 2
    range from after_header to before_locator
  }

  message "rmc" {
    select pattern "GPRMC*"
    field line ascii term "\r\n"
    compute fields = parse_nmea($line)   # 宿主提供小辅助函数
    compute lat = $.fields.lat
    compute lon = $.fields.lon
    assert $.lat != 0 || $.lon != 0
  }
}
```

---

# 高亮与配色（“自适应高亮”建议与落地）

你要两层高亮：**(1) 文件语法高亮（编辑时）** 与 **(2) 运行时结果高亮（解析输出时）**。下面给出**颜色建议**（暗/亮主题均适配）与**落地方法**（CLI ANSI、VS Code 语法规则、运行时状态着色）。

## 1) 元素 → 颜色建议（编辑器/终端通用）

| 元素                              | 颜色（暗主题）    | 颜色（亮主题）          | 说明        |
| ------------------------------- | ---------- | ---------------- | --------- |
| 节点名（protocol/frame/message/...） | 蓝青 Cyan    | 深蓝 Blue          | 结构主干，便于扫读 |
| 关键字（mode/header/length/...）     | 靛蓝 Indigo  | 紫蓝 SteelBlue     | 二级语义      |
| 类型名（u16/i16/ascii/bytes/...）    | 品红 Magenta | 紫色 Purple        | 一眼识别字段类型  |
| 字段名/枚举名                         | 青绿 Teal    | 绿 BlueGreen      | 数据实体      |
| 数值字面量（0xAA55/123）               | 橙 Orange   | 棕 Brown          | 边界或常量     |
| 字符串                             | 金黄 Gold    | 深金 DarkGoldenrod | 可读性好      |
| 注释                              | 灰 Gray     | 深灰 DimGray       | 不干扰主体     |
| 表达式/函数名                         | 玫红 Rose    | 洋红 Fuchsia       | 易与普通标识区分  |
| 错误/告警下划线                        | 红/波浪线      | 红/波浪线            | 语法或引用错误   |

> 建议同时提供“色盲友好”主题（提高饱和度 + 线型标记）。

## 2) 运行时高亮（解析输出）

* **帧同步**：`header/tail` → Cyan；`length字段` → Orange；**校验 OK** → 绿色勾 `✔`；**校验失败** → 红色 `✖`。
* **消息选择**：命中 `case` 名称 → 绿色；未命中/回退 → 黄色。
* **字段值**：

    * `enum` → **枚举名称**高亮（Teal），原值淡灰括注：`OK (0x00)`
    * `bitset` → 置位项绿色、未置位灰；异常位（保留应为0但为1）→ 橙色。
    * 单位转换 → 输出单位加金黄，原始值淡灰：`23.5 °C (raw 235 deci°C)`
* **断言失败**：整行红底或红字；**重组等待**：蓝灰进度条。
* **上下文/overlay**：`site/device_id` 以青绿标签显示。
* **时间/序号**：统一灰色，降低干扰。

### CLI ANSI 示例（你解析器可直接打印）

* 绿色：`\x1b[32m`，红色：`\x1b[31m`，青色：`\x1b[36m`，橙色可用黄：`\x1b[33m`，品红：`\x1b[35m`，灰：`\x1b[90m`，复位：`\x1b[0m`。
  示意：

```
[frame] header \x1b[36mAA55\x1b[0m  length \x1b[33m0x23\x1b[0m  checksum \x1b[32m✔ CRC16\x1b[0m
[msg]   case \x1b[32mstatus\x1b[0m (cmd=\x1b[35mReadStatus\x1b[0m/0x01)
field temp:  \x1b[36m23.5\x1b[0m \x1b[90m(raw 235 deci°C)\x1b[0m
assert $.hum <= 1000  \x1b[32mPASS\x1b[0m
```

## 3) VS Code 语法高亮（TextMate 规则片段）

将以下保存为 `kpt.tmLanguage.json` 并打包成扩展，或用 `language-configuration.json` 结合：

```json
{
  "name": "KPT",
  "scopeName": "source.kpt",
  "fileTypes": ["kpt"],
  "patterns": [
    { "name": "comment.line.number-sign.kpt", "match": "#.*$" },
    { "name": "keyword.control.kpt", "match": "\\b(protocol|frame|checksum|envelope|codec|enum|catalog|units|overlay|reassembly|message|case|group|compute|assert|export|tests|select|field|emit|length|mode|header|tail|store|range|locator|block|params|expose|topic_match|pair|kvsep|type|schema|file|base|when|transform|unit|convert_to|digits|endian|includes|count|countfrom|size|term|lenfrom|pattern|by|csv|key|define|measurement|tags|fields|timestamp|rename|move)\\b" },
    { "name": "storage.type.kpt", "match": "\\b(u|i)(8|16|24|32|64)|f(32|64)|bool|ascii|bytes|bcd|bitset|array\\b" },
    { "name": "constant.numeric.hex.kpt", "match": "0x[0-9A-Fa-f]+" },
    { "name": "constant.numeric.dec.kpt", "match": "\\b\\d+\\b" },
    { "name": "string.quoted.kpt", "begin": "\"", "end": "\"", "patterns": [{ "include": "#escapes" }] },
    { "name": "string.quoted.single.kpt", "begin": "'", "end": "'", "patterns": [{ "include": "#escapes" }] },
    { "name": "entity.name.function.kpt", "match": "^(\\s*)(protocol|message|codec|enum)\\s+\"[^\"]+\"" }
  ],
  "repository": {
    "escapes": { "patterns": [{ "name": "constant.character.escape.kpt", "match": "\\\\." }] }
  }
}
```

在 `package.json` 声明语言与配色；主题里把上述 scopes 映射到建议色。

## 4) 运行时高亮落地（编辑器内 / Web UI）

* 将解析结果 JSON 渲染为**结构化树**；为每个节点添加 `status`（ok/warn/error/pending）。
* 根据 `node.type`（frame/message/field/assert/envelope/overlay）加 class：`.kpt-ok`（绿）、`.kpt-warn`（橙）、`.kpt-error`（红）、`.kpt-ctx`（青绿）、`.kpt-const`（橙）、`.kpt-enum`（紫）。
* 提供“色弱模式”开关：用**双重编码**（颜色 + 图标/下划线/粗体）。

---

# 将“用户自定义额外信息”合并到转换

你的诉求：**代码→名称**、**单位符号**、**位置**、**标签**等。KPT 已内置三条路径：

1. **码表 catalog + lookup()**

    * 支持 CSV/JSON/内联；合并名称、单位、缩放、经纬度等。
    * 在 `compute`、`overlay`、`export` 里使用。

2. **units + convert_to**

    * 在字段层声明本地单位；统一转换为平台单位（例如 SI/工程习惯单位）。

3. **overlay context**

    * 将位置、资产、标签等外部上下文**不占字节地**注入输出；
    * 与 `envelope` 参数（如 MQTT 主题中的 site/mn）联动。

> 输出 JSON 统一形态：

```json
{
  "meta": { "protocol": "jbf293k-like", "checksum_ok": true, "ts": "2025-09-29T13:10:00Z" },
  "envelope": { "site": "A1", "mn": "DEV001" },
  "message": {
    "name": "status",
    "fields": { "temp": 23.5, "hum": 45.0, "result": "OK (0x00)" },
    "context": { "device_id": "DEV001", "latitude": 31.23, "longitude": 121.47, "tags": ["factory:A","line:3"] }
  }
}
```

---

# 实施建议（解析器）

1. **前端阶段**：词法 → 语法树（AST）→ 语义校验（字段引用、循环依赖、case 命中性检查）。
2. **运行阶段**：帧同步（含 locator/block/HMAC）→ 消息路由 → 字段解析（含 transform/codec）→ 单位换算 → 断言 → overlay 合并 → 导出。
3. **插件机制**：`codec`、`transform`、`checksum.custom`、`parse_nmea()` 以 SPI 形式注册。
4. **性能**：码表/单位/表达式/CRC 参数全部**预编译与缓存**；`reassembly` 使用 LRU + 超时。
5. **安全**：`key_ref` 外部注入；`.kpt` 文件中不存明文密钥。
6. **可观测性**：`--trace` 输出逐字节消费轨迹；`--explain` 展示为何命中某 case；错误用**红色波浪线定位偏移**。

---

# 小结

* `.kpt` = 统一、极简、可扩展的通用协议模板语言。
* v1.1 已覆盖：**分帧/多种校验/复杂负载编解码/分片重组/单位换算/外部码表/上下文叠加/导出映射**。
* 高亮方案给到**元素配色表 + CLI ANSI + VS Code 语法定义**，并附**运行时状态着色**的落地做法。
