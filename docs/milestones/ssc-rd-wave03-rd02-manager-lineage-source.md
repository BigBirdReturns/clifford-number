# SSC RD Wave 03 - RD-02 manager-lineage replay source

The failed 2021 Stifel disclosure route has now been replayed exactly once after preserving the raw candidate identity and percent-encoding only literal spaces for transport.

## Replay custody

```text
canonical replay protocol merge:
83eb74ce48573dbcb0c76d05733cef1177df651a

workflow run:                  30953678041
trigger PR:                    #1086
trigger state:                 closed without merge
trigger head:
5562c0f16ff4a2f41a3570b6a9a80186a710c1bc
synthetic merge head:
cff37cffcc8991fb98bce2fa14f89d8faf350705

artifact ID:                   8910162314
artifact ZIP bytes:               398,574
artifact ZIP SHA-256:
ce479d1defb29c6fd07f7981730a8d11d5784d698fd51ead23f38bbed29c7cd7

artifact manifest entries:             14
artifact manifest combined SHA-256:
453c755ea7f9db540798f0e7a2d78ca65f8e23245a707bdb5e4cecfa4e63a857
```

```text
fixed replay routes:              1
replay attempts:                  1
terminal replay routes:           1
successful prior routes replayed: 0
HTTP success / restriction:     1 / 0
result-spawned requests:          0
```

## Exact PDF inspection

```text
route:                         RD02-W03-DLR001
HTTP status:                   200
content type:                  application/pdf
body bytes:                    403,442
body SHA-256:
23fbef23cb77df6a6933bafd273b65ea034f14d10ff4ef40c05775a73fde67cf
headers SHA-256:
45364d4cd0e5b9365dfccf632ee87af6c143ec6702612dcfd701e3c929d7c51d

pages:                         2
page size:                     612x792 points
extracted text bytes:          4,581
extracted text SHA-256:
5e9b8e9167e6d3956a5f29d1b8d94e9724f152b22ba89b3d9362ed6ec434b76f

render DPI:                    200
page 1 render SHA-256:
ae8e18b55f3358864bea8e89bea61ab1801b2d844975d79246d76b5cb129706d
page 2 render SHA-256:
461d0c446dba37d93a666403e691d6d8bfb8700e55f0582fcb8cb183269c66a8
```

Every page was rendered and inspected.

## Admitted source

```text
source ID:
STIFEL-NORTH-ATLANTIC-2021-MANAGER-LINEAGE

publication date: 2021-02-19
publisher:        Stifel Financial Corp.
```

The source supports four bounded observations:

```text
1  Stifel announced an agreement to acquire the future business of
   North Atlantic Capital Corporation.

2  North Atlantic was re-branded North Atlantic Capital - a Stifel Company.

3  Stifel made a financial commitment to invest in the next
   North Atlantic SBIC.

4  The announced acquisition was described as positioning Stifel as an
   active manager of SBIC and venture-capital funds.
```

The source does not identify `Stifel North Atlantic AM-Forward, LP` or the later public name `Stifel North Atlantic AM-Forward Fund`. It is an antecedent manager-lineage and commitment source, not an exact frozen-vehicle identity source.

## Nonpromotions

```text
announced acquisition agreement != observed acquisition closing
financial commitment            != capital funded
financial commitment            != portfolio investment
next North Atlantic SBIC         != exact later AM-Forward vehicle
historical manager portfolio     != later fund portfolio
SBIC manager context             != later fund license or leverage draw
missing lifecycle record         != event absence
```

The statement that North Atlantic had historically invested in more than 100 companies remains manager-level context. It is not assigned to the unnamed next SBIC or the later frozen vehicle.

## Cumulative leaf result

The 2024 approval source and 2021 manager-lineage source now remain separate:

```text
admitted leaf sources:                     2
bounded observations:                     11
RD-02-C05 lifecycle events observed:       0
fields terminally closed by leaf sources:  0
rows terminally closed by leaf sources:    0
```

```text
frozen cohort rows:                 18
required fields per row:            10
required matrix cells:             180
field matrix terminal:           false
class state:                 still_open
class closed:                    false
```

No additional automatic search pass is authorized. The next operation is to terminally classify all 180 matrix cells from the complete fixed-protocol record, preserving observed evidence, source limits, withheld identity, and unknown lifecycle outcomes separately.

## Package custody

```text
execution receipt SHA-256:
c46b51863709d3bf2191d11cfb61ad242a1d146b3701a98b0fdc25489a349e1c

source receipt SHA-256:
109173a0b9c4b5657f9e90b4644d40bc409312cb128e5ccea73e70ce6a66dd14

summary SHA-256:
db808f3c0842fe2c9a38a645c8423c93d8a4d003258282d0d153fc9696f5b78b

manifest SHA-256:
6e3ce909a033cdecc51a62bc718e85a992f16e128be9b703ca81f91cde306ae1

manifest combined SHA-256:
e96286ac8b7863da128ec1183e018048582377aaa07edc1e7f303eda75509cff
```

## Authority boundary

```text
outside-human dependency:       false
external contacts / reviews:    0 / 0
capital-conversion finding:     false
favoritism / extraction:        false / false
coordination / common purpose:  false / false
complete-compact finding:       false
publication / adoption / graph: none / none / none
```
