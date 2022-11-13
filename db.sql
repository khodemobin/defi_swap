CREATE SEQUENCE  token_id_seq;
create table tokens (id integer NOT NULL DEFAULT nextval('token_id_seq'), contract varchar not null, symbol varchar not null ,blockchin varchar not null);

ALTER SEQUENCE token_id_seq OWNED BY tokens.id;

INSERT INTO public.tokens ( contract, symbol, blockchin) VALUES ('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 'ETH');
INSERT INTO public.tokens ( contract,  symbol, blockchin) VALUES ('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 'ETH');
INSERT INTO public.tokens ( contract,  symbol, blockchin) VALUES ('TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', 'USDT-TRX', 'TRX_EX');
INSERT INTO public.tokens ( contract,  symbol, blockchin) VALUES ('TRz7J6dD2QWxBoumfYt4b3FaiRG23pXfop', 'TUSD', 'TRX');